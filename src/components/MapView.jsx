import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Source, Layer } from "react-map-gl";
import maplibregl from "maplibre-gl";
import { along, bearing, destination, lineString, length as turfLength } from "@turf/turf";
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
      attribution: "© MapTiler © OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#191a19" },
    },
    {
      id: "maptiler-base",
      type: "raster",
      source: "maptiler",
      paint: {
        "raster-saturation": -0.9,
        "raster-contrast": 0.1,
        "raster-brightness-min": 0,
        "raster-brightness-max": 0.25,
        "raster-opacity": 0.7,
      },
    },
  ],
};

const deltaColors = {
  up: "#6fcb5a",
  down: "#2f6b34",
};

const Timeline = ({
  timeSlots,
  timeIndex,
  onChange,
  stats,
  isAutoPlaying,
  onToggleAutoPlay,
}) => {
  const startLabel = timeSlots[0] ?? "--:--";
  const endLabel = timeSlots[timeSlots.length - 1] ?? "--:--";
  const progress =
    timeSlots.length > 1
      ? Math.round((timeIndex / (timeSlots.length - 1)) * 100)
      : 0;

  return (
    <div className="glass-panel absolute left-1/2 top-4 z-[20] w-[92vw] max-w-[430px] -translate-x-1/2 rounded-[28px] px-5 py-4 shadow-lg sm:top-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#9fd1a5]">
            タイムライン
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {startLabel} 〜 {endLabel} ・ 15分刻み
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
            現在
          </div>
          <div className="text-lg font-semibold text-slate-50">{timeSlots[timeIndex]}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        <span>
          Slot {timeIndex + 1}/{timeSlots.length}
        </span>
        <span>{progress}%</span>
      </div>

      <input
        className="timeline-range mt-2 w-full"
        type="range"
        min="0"
        max={timeSlots.length - 1}
        value={timeIndex}
        onChange={(event) => onChange(Number(event.target.value))}
      />

      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-200">
        <div className="rounded-xl border border-[#1E5128]/70 bg-[#191A19]/70 px-3 py-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            平均密度
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-50">{stats.avgMesh}</div>
        </div>
        <div className="rounded-xl border border-[#1E5128]/70 bg-[#191A19]/70 px-3 py-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            ピーク密度
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-50">{stats.peakMesh}</div>
        </div>
        <div className="rounded-xl border border-[#1E5128]/70 bg-[#191A19]/70 px-3 py-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            平均稼働率
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-50">{stats.avgOccupancy}%</div>
        </div>
        <div className="rounded-xl border border-[#1E5128]/70 bg-[#191A19]/70 px-3 py-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            平均料金
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-50">
            {formatYen(stats.avgPrice)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          className={`timeline-play ${isAutoPlaying ? "is-playing" : ""}`}
          onClick={onToggleAutoPlay}
          type="button"
        >
          {isAutoPlaying ? "再生中 · 停止" : "自動再生"}
        </button>
        <div className="text-[10px] text-slate-500">最初から最後まで1回再生</div>
      </div>
    </div>
  );
};

const Legend = () => (
  <div className="glass-panel absolute bottom-4 left-4 z-[20] w-[80vw] max-w-[16rem] rounded-2xl px-4 py-4 text-xs text-slate-300 shadow-lg sm:bottom-6 sm:left-6">
    <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">メッシュ密度</div>
    <div className="mt-3 flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: meshBandColors.low }} />
      <span>低</span>
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: meshBandColors.mid }} />
      <span>中</span>
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: meshBandColors.high }} />
      <span>高</span>
    </div>
    <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">駐車稼働率</div>
    <div className="mt-3 flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: occupancyColors.low }} />
      <span>低</span>
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: occupancyColors.mid }} />
      <span>中</span>
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: occupancyColors.high }} />
      <span>高</span>
    </div>
    <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">変化量</div>
    <div className="mt-3 flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: deltaColors.down }} />
      <span>減少</span>
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: deltaColors.up }} />
      <span>増加</span>
    </div>
    <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">フロー矢印</div>
    <div className="mt-3 flex items-center gap-2">
      <span className="h-1 w-6 rounded-full bg-[#4E9F3D]" />
      <span>人流方向</span>
    </div>
  </div>
);

const ScenarioCard = ({ scenario }) => (
  <div className="glass-panel absolute bottom-4 right-4 z-[20] w-[90vw] max-w-[20rem] rounded-2xl px-5 py-4 text-sm text-slate-200 shadow-lg sm:bottom-6 sm:right-6">
    <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">適用中パターン</div>
    <div className="mt-2 text-lg font-semibold text-slate-50">{scenario.title}</div>
    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{scenario.pattern}</div>
    <p className="mt-3 text-xs leading-relaxed text-slate-300">{scenario.summary}</p>
    <div className="mt-4 space-y-2 text-xs">
      {scenario.rules.map((rule) => (
        <div
          key={rule}
          className="rounded-xl border border-[#1E5128]/70 bg-[#191A19]/70 px-3 py-2 shadow-sm"
        >
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
        : "hover:-translate-y-0.5 hover:bg-[#1E5128]/40"
    }`}
    onClick={onGenerate}
    disabled={disabled}
  >
    レポート生成
  </button>
);

const patternDash = {
  peak: [6, 4],
  demand: [2, 6],
  balance: [10, 6, 2, 6],
};

const buildArrowPolygon = (path, weight = 0.8) => {
  if (!path || path.length < 2) return [];
  const coordinates = path.map(([lat, lng]) => [lng, lat]);
  const line = lineString(coordinates);
  const lineLength = Math.max(turfLength(line, { units: "kilometers" }), 0.12);
  const headLength = clamp(lineLength * (0.16 + weight * 0.05), 0.08, 0.22);
  const headWidth = clamp(headLength * (0.7 + weight * 0.2), 0.04, 0.18);
  const end = along(line, lineLength, { units: "kilometers" });
  const base = along(line, Math.max(lineLength - headLength, lineLength * 0.82), {
    units: "kilometers",
  });
  const heading = bearing(base, end);
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
  mapRef,
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
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayRef = useRef(null);

  const meshGeojson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: meshDisplay.map((mesh) => {
        const band = getMeshBand(mesh.count);
        const delta = mesh.count - mesh.baseCount;
        const deltaAbs = Math.abs(delta);
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
            deltaAbs,
            fill: meshBandColors[band],
          },
        };
      }),
    };
  }, [meshDisplay]);

  const timelineStats = useMemo(() => {
    const meshTotal = meshDisplay.reduce((sum, mesh) => sum + mesh.count, 0);
    const meshPeak = meshDisplay.reduce(
      (max, mesh) => Math.max(max, mesh.count),
      0
    );
    const parkingTotal = parkingDisplay.reduce(
      (sum, lot) => sum + lot.occupancyValue,
      0
    );
    const priceTotal = parkingDisplay.reduce(
      (sum, lot) => sum + lot.priceValue,
      0
    );
    const meshCount = Math.max(meshDisplay.length, 1);
    const parkingCount = Math.max(parkingDisplay.length, 1);

    return {
      avgMesh: Math.round(meshTotal / meshCount),
      peakMesh: meshPeak,
      avgOccupancy: Math.round((parkingTotal / parkingCount) * 100),
      avgPrice: Math.round(priceTotal / parkingCount),
    };
  }, [meshDisplay, parkingDisplay]);

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
            occupancyDeltaAbs: Math.abs(occupancyDelta),
            price: lot.priceValue,
            basePrice: lot.basePrice,
            priceDelta,
            priceDeltaAbs: Math.abs(priceDelta),
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
      features: flowLines.map((line) => {
        const path = line.path ?? [line.from, line.to];
        return {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: path.map(([lat, lng]) => [lng, lat]),
          },
          properties: {
            color: line.color,
            weight: line.weight ?? 0.6,
            label: line.label ?? "",
            value: line.value ?? 0,
            trend: line.trend ?? "",
          },
        };
      }),
    };
  }, [flowLines]);

  const arrowGeojson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: flowLines
        .map((line) => {
          const path = line.path ?? [line.from, line.to];
          const polygon = buildArrowPolygon(path, line.weight ?? 0.6);
          if (!polygon.length) return null;
          return {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [polygon],
            },
            properties: {
              color: line.color,
              weight: line.weight ?? 0.6,
              label: line.label ?? "",
              value: line.value ?? 0,
              trend: line.trend ?? "",
            },
          };
        })
        .filter(Boolean),
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

  useEffect(() => {
    if (!isAutoPlaying) return;
    if (!timeSlots.length) return;

    if (timeIndex >= timeSlots.length - 1) {
      setIsAutoPlaying(false);
      return;
    }

    autoPlayRef.current = window.setTimeout(() => {
      onTimeChange(timeIndex + 1);
    }, 900);

    return () => window.clearTimeout(autoPlayRef.current);
  }, [isAutoPlaying, timeIndex, timeSlots.length, onTimeChange]);

  const handleAutoPlayToggle = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      return;
    }
    onTimeChange(0);
    setIsAutoPlaying(true);
  };

  const handleManualTimeChange = (nextIndex) => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
    }
    onTimeChange(nextIndex);
  };

  const meshFillLayer = {
    id: "mesh-fill",
    type: "fill",
    source: "mesh",
    paint: {
      "fill-color": ["get", "fill"],
      "fill-opacity": 0.32,
      "fill-color-transition": { duration: 1000 },
      "fill-opacity-transition": { duration: 1000 },
    },
  };

  const meshDeltaLayer = {
    id: "mesh-change",
    type: "fill",
    source: "mesh",
    paint: {
      "fill-color": [
        "case",
        [">", ["get", "delta"], 0],
        deltaColors.up,
        ["<", ["get", "delta"], 0],
        deltaColors.down,
        "rgba(0,0,0,0)",
      ],
      "fill-opacity": [
        "interpolate",
        ["linear"],
        ["get", "deltaAbs"],
        0,
        0,
        10,
        0.06,
        35,
        0.18,
        80,
        0.38,
      ],
      "fill-opacity-transition": { duration: 1000 },
    },
  };

  const meshOutlineLayer = {
    id: "mesh-outline",
    type: "line",
    source: "mesh",
    paint: {
      "line-color": "#243226",
      "line-opacity": 0.45,
      "line-width": 0.9,
      "line-opacity-transition": { duration: 1000 },
    },
  };

  const meshPatternLayer = scenario
    ? {
        id: "mesh-pattern",
        type: "line",
        source: "mesh",
        paint: {
          "line-color": "#4e9f3d",
          "line-width": 0.9,
          "line-opacity": 0.45,
          "line-dasharray": patternDash[scenario.id],
        },
      }
    : null;

  const parkingDeltaLayer = scenario
    ? {
        id: "parking-delta",
        type: "circle",
        source: "parking",
        paint: {
          "circle-color": [
            "case",
            [">", ["get", "occupancyDelta"], 0],
            deltaColors.up,
            ["<", ["get", "occupancyDelta"], 0],
            deltaColors.down,
            "rgba(0,0,0,0)",
          ],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "occupancyDeltaAbs"],
            0,
            0,
            8,
            9,
            25,
            14,
            45,
            20,
          ],
          "circle-opacity": 0.18,
          "circle-blur": 0.7,
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
      "circle-opacity": 0.14,
      "circle-stroke-color": ["get", "color"],
      "circle-stroke-width": 1.6,
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
      "circle-opacity": 0.78,
      "circle-stroke-color": "#0f1a12",
      "circle-stroke-width": 1,
      "circle-color-transition": { duration: 1000 },
      "circle-radius-transition": { duration: 1000 },
      "circle-opacity-transition": { duration: 1000 },
      "circle-stroke-color-transition": { duration: 1000 },
    },
  };

  const flowGlowLayer = {
    id: "flow-line-glow",
    type: "line",
    source: "flow",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["get", "weight"], 0, 4, 1.2, 12],
      "line-opacity": 0.18,
      "line-blur": 1.6,
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
      "line-opacity": ["interpolate", ["linear"], ["get", "weight"], 0.2, 0.4, 1.2, 0.82],
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
      "fill-opacity": 0.75,
      "fill-outline-color": "#132418",
      "fill-opacity-transition": { duration: 1000 },
    },
  };

  return (
    <div ref={mapContainerRef} className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom: 12.8,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        mapLib={maplibregl}
        preserveDrawingBuffer
        interactiveLayerIds={["mesh-fill", "parking-circle", "flow-line", "flow-arrow"]}
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
          <Layer {...meshDeltaLayer} />
          <Layer {...meshOutlineLayer} />
          {meshPatternLayer && <Layer {...meshPatternLayer} />}
        </Source>

        {flowLines.length > 0 && (
          <>
            <Source id="flow" type="geojson" data={flowGeojson}>
              <Layer {...flowGlowLayer} />
              <Layer {...flowLayer} />
            </Source>
            <Source id="arrows" type="geojson" data={arrowGeojson}>
              <Layer {...arrowLayer} />
            </Source>
          </>
        )}

        <Source id="parking" type="geojson" data={parkingGeojson}>
          {parkingDeltaLayer && <Layer {...parkingDeltaLayer} />}
          {parkingRingLayer && <Layer {...parkingRingLayer} />}
          <Layer {...parkingLayer} />
        </Source>
      </Map>

      {hoverInfo && (
        <div
          className="pointer-events-none absolute z-[30] rounded-xl bg-[#191A19]/95 px-3 py-2 text-xs text-slate-200 shadow-lg"
          style={{ left: hoverInfo.point.x + 12, top: hoverInfo.point.y + 12 }}
        >
          {hoverInfo.feature.layer.id === "mesh-fill" ? (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {hoverInfo.feature.properties.label}
              </div>
              <div className="font-semibold text-slate-50">
                メッシュ {hoverInfo.feature.properties.id}
              </div>
              <div>
                人数: {hoverInfo.feature.properties.count}{" "}
                <span className="text-[10px] text-slate-400">
                  (
                  {Number(hoverInfo.feature.properties.delta) > 0 ? "+" : ""}
                  {hoverInfo.feature.properties.delta})
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                基準: {hoverInfo.feature.properties.baseCount}
              </div>
            </div>
          ) : hoverInfo.feature.layer.id === "parking-circle" ? (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                駐車場
              </div>
              <div className="font-semibold text-slate-50">
                {hoverInfo.feature.properties.name}
              </div>
              <div>
                稼働率: {hoverInfo.feature.properties.occupancy}%
                <span className="text-[10px] text-slate-400">
                  {" "}(
                  {hoverInfo.feature.properties.occupancyDelta > 0 ? "+" : ""}
                  {hoverInfo.feature.properties.occupancyDelta}%)
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                基準: {hoverInfo.feature.properties.baseOccupancy}%
              </div>
              <div>収容: {hoverInfo.feature.properties.capacity}</div>
              <div>
                料金: {formatYen(Number(hoverInfo.feature.properties.price))}{" "}
                <span className="text-[10px] text-slate-400">
                  (
                  {hoverInfo.feature.properties.priceDelta > 0 ? "+" : ""}
                  {formatYen(Number(hoverInfo.feature.properties.priceDelta))})
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                基準: {formatYen(Number(hoverInfo.feature.properties.basePrice))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                フロー
              </div>
              <div className="font-semibold text-slate-50">
                {hoverInfo.feature.properties.label || "人流ベクトル"}
              </div>
              <div>推定移動量: {hoverInfo.feature.properties.value} 人</div>
              <div className="text-[10px] text-slate-400">
                強度: {Math.round(Number(hoverInfo.feature.properties.weight) * 100)}%
              </div>
            </div>
          )}
        </div>
      )}

      {showTimeline && (
        <Timeline
          timeSlots={timeSlots}
          timeIndex={timeIndex}
          onChange={handleManualTimeChange}
          stats={timelineStats}
          isAutoPlaying={isAutoPlaying}
          onToggleAutoPlay={handleAutoPlayToggle}
        />
      )}
      <Legend />
      <ReportButton onGenerate={onGenerateReport} disabled={!scenario} />
      {scenario && <ScenarioCard scenario={scenario} />}
    </div>
  );
};

export default MapView;
