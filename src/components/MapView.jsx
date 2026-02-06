import { useMemo, useState } from "react";
import Map, { Source, Layer } from "react-map-gl";
import maplibregl from "maplibre-gl";
import { bearing, destination, distance as turfDistance, point } from "@turf/turf";
import {
  getMeshBand,
  getOccupancyBand,
  meshBandColors,
  occupancyColors,
  formatYen,
  clamp,
} from "../data/mockData";

const mapStyle = {
  version: 8,
  sources: {
    maptiler: {
      type: "raster",
      url: "https://api.maptiler.com/maps/streets-v4/tiles.json?key=uabdCkQNz8KjbO5DdjMb",
      attribution: "c MapTiler c OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#f8fafc" },
    },
    {
      id: "maptiler-base",
      type: "raster",
      source: "maptiler",
      paint: {
        "raster-saturation": -0.15,
        "raster-contrast": 0.1,
        "raster-opacity": 0.95,
      },
    },
  ],
};

const Timeline = ({ timeSlots, timeIndex, onChange }) => (
  <div className="glass-panel absolute left-1/2 top-4 z-[20] w-[90vw] max-w-[360px] -translate-x-1/2 rounded-[28px] px-5 py-3 shadow-lg sm:top-6">
    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
      <span>Timeline</span>
      <span className="text-slate-800">{timeSlots[timeIndex]}</span>
    </div>
    <input
      className="timeline-range mt-3 w-full"
      type="range"
      min="0"
      max={timeSlots.length - 1}
      value={timeIndex}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </div>
);

const Legend = () => (
  <div className="glass-panel absolute bottom-4 left-4 z-[20] w-[80vw] max-w-[14rem] rounded-2xl px-4 py-4 text-xs text-slate-600 shadow-lg sm:bottom-6 sm:left-6">
    <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Mesh Density</div>
    <div className="mt-3 flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#22c55e" }} />
      <span>Low</span>
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#facc15" }} />
      <span>Medium</span>
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#f97316" }} />
      <span>High</span>
    </div>
    <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Parking Occupancy</div>
    <div className="mt-3 flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#22c55e" }} />
      <span>Low</span>
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#facc15" }} />
      <span>Medium</span>
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ef4444" }} />
      <span>High</span>
    </div>
  </div>
);

const ScenarioCard = ({ scenario }) => (
  <div className="glass-panel absolute bottom-4 right-4 z-[20] w-[90vw] max-w-[20rem] rounded-2xl px-5 py-4 text-sm text-slate-700 shadow-lg sm:bottom-6 sm:right-6">
    <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Active Pattern</div>
    <div className="mt-2 text-lg font-semibold text-slate-900">{scenario.title}</div>
    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{scenario.pattern}</div>
    <p className="mt-3 text-xs leading-relaxed text-slate-600">{scenario.summary}</p>
    <div className="mt-4 space-y-2 text-xs">
      {scenario.rules.map((rule) => (
        <div key={rule} className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 shadow-sm">
          {rule}
        </div>
      ))}
    </div>
  </div>
);

const ReportButton = ({ onGenerate, disabled }) => (
  <button
    className={`glass-panel absolute right-4 top-4 z-[20] rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] shadow-lg transition sm:right-6 sm:top-6 ${
      disabled
        ? "cursor-not-allowed opacity-50"
        : "hover:-translate-y-0.5 hover:bg-white"
    }`}
    onClick={onGenerate}
    disabled={disabled}
  >
    Generate Report
  </button>
);

const patternDash = {
  peak: [6, 4],
  demand: [2, 6],
  balance: [10, 6, 2, 6],
};

const toPoint = ([lat, lng]) => point([lng, lat]);

const buildArrowPolygon = (from, to, weight = 0.8) => {
  const start = toPoint(from);
  const end = toPoint(to);
  const lineDistance = Math.max(
    turfDistance(start, end, { units: "kilometers" }),
    0.15
  );
  const headLength = Math.min(lineDistance * 0.28, 0.22);
  const headWidth = clamp(headLength * (0.55 + weight * 0.25), 0.03, 0.16);
  const heading = bearing(start, end);
  const base = destination(end, headLength, heading + 180, {
    units: "kilometers",
  });
  const left = destination(base, headWidth, heading - 90, {
    units: "kilometers",
  });
  const right = destination(base, headWidth, heading + 90, {
    units: "kilometers",
  });

  return [
    end.geometry.coordinates,
    left.geometry.coordinates,
    right.geometry.coordinates,
    end.geometry.coordinates,
  ];
};

const MapView = ({
  mapContainerRef,
  center,
  meshDisplay,
  parkingDisplay,
  timeSlots,
  timeIndex,
  showTimeline,
  onTimeChange,
  flowLines,
  scenario,
  onGenerateReport,
}) => {
  const [hoverInfo, setHoverInfo] = useState(null);

  const meshGeojson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: meshDisplay.map((mesh) => {
        const band = getMeshBand(mesh.count);
        const delta = mesh.count - mesh.baseCount;
        return {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [mesh.polygon.map(([lat, lng]) => [lng, lat])],
          },
          properties: {
            id: mesh.id,
            label: mesh.label,
            count: mesh.count,
            baseCount: mesh.baseCount,
            delta,
            fill: meshBandColors[band],
          },
        };
      }),
    };
  }, [meshDisplay]);

  const parkingGeojson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: parkingDisplay.map((lot) => {
        const band = getOccupancyBand(lot.occupancyValue);
        const occupancy = Math.round(lot.occupancyValue * 100);
        const baseOccupancy = Math.round(lot.baseOcc * 100);
        const occupancyDelta = occupancy - baseOccupancy;
        const priceDelta = Math.round(lot.priceValue - lot.basePrice);
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [lot.position[1], lot.position[0]],
          },
          properties: {
            id: lot.id,
            name: lot.name,
            occupancy,
            baseOccupancy,
            occupancyDelta,
            price: lot.priceValue,
            basePrice: lot.basePrice,
            priceDelta,
            capacity: lot.capacity,
            color: occupancyColors[band],
          },
        };
      }),
    };
  }, [parkingDisplay]);

  const flowGeojson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: flowLines.map((line) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [line.from[1], line.from[0]],
            [line.to[1], line.to[0]],
          ],
        },
        properties: {
          color: line.color,
          weight: line.weight ?? 0.6,
          label: line.label ?? "",
        },
      })),
    };
  }, [flowLines]);

  const arrowGeojson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: flowLines.map((line) => ({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [buildArrowPolygon(line.from, line.to, line.weight ?? 0.6)],
        },
        properties: {
          color: line.color,
          weight: line.weight ?? 0.6,
          label: line.label ?? "",
        },
      })),
    };
  }, [flowLines]);

  const bounds = useMemo(() => {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    meshDisplay.forEach((mesh) => {
      mesh.polygon.forEach(([lat, lng]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });
    });

    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  }, [meshDisplay]);

  const meshFillLayer = {
    id: "mesh-fill",
    type: "fill",
    source: "mesh",
    paint: {
      "fill-color": ["get", "fill"],
      "fill-opacity": 0.42,
      "fill-color-transition": { duration: 1000 },
      "fill-opacity-transition": { duration: 1000 },
    },
  };

  const meshOutlineLayer = {
    id: "mesh-outline",
    type: "line",
    source: "mesh",
    paint: {
      "line-color": "#0f172a",
      "line-opacity": 0.4,
      "line-width": 1,
      "line-opacity-transition": { duration: 1000 },
    },
  };

  const meshPatternLayer = scenario
    ? {
        id: "mesh-pattern",
        type: "line",
        source: "mesh",
        paint: {
          "line-color": "#0f172a",
          "line-width": 1,
          "line-opacity": 0.7,
          "line-dasharray": patternDash[scenario.id],
        },
      }
    : null;

  const parkingRingLayer = scenario
    ? {
        id: "parking-ring",
        type: "circle",
        source: "parking",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["get", "occupancy"], 30, 12, 100, 18],
          "circle-opacity": 0.18,
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-color-transition": { duration: 1000 },
          "circle-radius-transition": { duration: 1000 },
          "circle-opacity-transition": { duration: 1000 },
        },
      }
    : null;

  const parkingLayer = {
    id: "parking-circle",
    type: "circle",
    source: "parking",
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": ["interpolate", ["linear"], ["get", "occupancy"], 30, 5, 100, 9],
      "circle-opacity": 0.9,
      "circle-stroke-color": "#0f172a",
      "circle-stroke-width": 1,
      "circle-color-transition": { duration: 1000 },
      "circle-radius-transition": { duration: 1000 },
      "circle-opacity-transition": { duration: 1000 },
      "circle-stroke-color-transition": { duration: 1000 },
    },
  };

  const flowLayer = {
    id: "flow-line",
    type: "line",
    source: "flow",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["get", "weight"], 0, 1.5, 1.2, 5.5],
      "line-opacity": 0.75,
      "line-opacity-transition": { duration: 1000 },
      "line-width-transition": { duration: 1000 },
      "line-color-transition": { duration: 1000 },
      ...(scenario?.id === "peak" ? { "line-dasharray": [2, 4] } : {}),
    },
  };

  const arrowLayer = {
    id: "flow-arrow",
    type: "fill",
    source: "arrows",
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": 0.88,
      "fill-opacity-transition": { duration: 1000 },
    },
  };

  return (
    <div ref={mapContainerRef} className="relative h-full w-full">
      <Map
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom: 12.8,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        mapLib={maplibregl}
        interactiveLayerIds={["mesh-fill", "parking-circle"]}
        onMouseMove={(event) => {
          const { features, point } = event;
          const feature = features && features[0];
          if (!feature) {
            setHoverInfo(null);
            return;
          }
          setHoverInfo({
            feature,
            point,
          });
        }}
        onMouseLeave={() => setHoverInfo(null)}
        onLoad={(event) => {
          if (!Number.isFinite(bounds[0][0])) return;
          event.target.fitBounds(bounds, {
            padding: { top: 90, bottom: 90, left: 120, right: 120 },
            duration: 0,
          });
        }}
      >
        <Source id="mesh" type="geojson" data={meshGeojson}>
          <Layer {...meshFillLayer} />
          <Layer {...meshOutlineLayer} />
          {meshPatternLayer && <Layer {...meshPatternLayer} />}
        </Source>

        {flowLines.length > 0 && (
          <>
            <Source id="flow" type="geojson" data={flowGeojson}>
              <Layer {...flowLayer} />
            </Source>
            <Source id="arrows" type="geojson" data={arrowGeojson}>
              <Layer {...arrowLayer} />
            </Source>
          </>
        )}

        <Source id="parking" type="geojson" data={parkingGeojson}>
          {parkingRingLayer && <Layer {...parkingRingLayer} />}
          <Layer {...parkingLayer} />
        </Source>
      </Map>

      {hoverInfo && (
        <div
          className="pointer-events-none absolute z-[30] rounded-xl bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-lg"
          style={{ left: hoverInfo.point.x + 12, top: hoverInfo.point.y + 12 }}
        >
          {hoverInfo.feature.layer.id === "mesh-fill" ? (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {hoverInfo.feature.properties.label}
              </div>
              <div className="font-semibold text-slate-900">
                Mesh {hoverInfo.feature.properties.id}
              </div>
              <div>
                People: {hoverInfo.feature.properties.count}{" "}
                <span className="text-[10px] text-slate-500">
                  (
                  {Number(hoverInfo.feature.properties.delta) > 0 ? "+" : ""}
                  {hoverInfo.feature.properties.delta})
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                Baseline: {hoverInfo.feature.properties.baseCount}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Parking Lot
              </div>
              <div className="font-semibold text-slate-900">
                {hoverInfo.feature.properties.name}
              </div>
              <div>
                Occupancy: {hoverInfo.feature.properties.occupancy}%
                <span className="text-[10px] text-slate-500">
                  {" "}
                  (
                  {hoverInfo.feature.properties.occupancyDelta > 0 ? "+" : ""}
                  {hoverInfo.feature.properties.occupancyDelta}%)
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                Baseline: {hoverInfo.feature.properties.baseOccupancy}%
              </div>
              <div>Capacity: {hoverInfo.feature.properties.capacity}</div>
              <div>
                Price: {formatYen(Number(hoverInfo.feature.properties.price))}{" "}
                <span className="text-[10px] text-slate-500">
                  (
                  {hoverInfo.feature.properties.priceDelta > 0 ? "+" : ""}
                  {formatYen(Number(hoverInfo.feature.properties.priceDelta))})
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                Baseline: {formatYen(Number(hoverInfo.feature.properties.basePrice))}
              </div>
            </div>
          )}
        </div>
      )}

      {showTimeline && (
        <Timeline timeSlots={timeSlots} timeIndex={timeIndex} onChange={onTimeChange} />
      )}
      <Legend />
      <ReportButton onGenerate={onGenerateReport} disabled={!scenario} />
      {scenario && <ScenarioCard scenario={scenario} />}
    </div>
  );
};

export default MapView;

