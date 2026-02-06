import {
  bearing,
  bezierSpline,
  destination,
  distance as turfDistance,
  lineString,
  point,
} from "@turf/turf";
import { clamp } from "../data/mockData";

const toPoint = ([lat, lng]) => point([lng, lat]);

const peakPriceMultiplier = (timeIndex, slotCount) => {
  if (!Number.isFinite(timeIndex) || !Number.isFinite(slotCount) || slotCount <= 1) {
    return 1;
  }
  const t = timeIndex / (slotCount - 1);
  const peak = Math.exp(-Math.pow((t - 0.55) / 0.18, 2));
  const morningDip = Math.exp(-Math.pow((t - 0.12) / 0.14, 2));
  return clamp(0.96 + 0.28 * peak - 0.12 * morningDip, 0.85, 1.28);
};

const demandPriceMultiplier = (occupancy) => {
  const pressure = clamp((occupancy - 0.55) / 0.35, -1, 1);
  return 1 + pressure * 0.3;
};

const buildCurvePath = (from, to, curveStrength = 0.22, direction = 1) => {
  const start = toPoint(from);
  const end = toPoint(to);
  const distanceKm = turfDistance(start, end, { units: "kilometers" });
  if (!Number.isFinite(distanceKm) || distanceKm <= 0.05) {
    return [from, to];
  }

  const heading = bearing(start, end);
  const mid = destination(start, distanceKm * 0.5, heading, { units: "kilometers" });
  const offsetDistance = clamp(distanceKm * curveStrength, 0.12, 0.45);
  const control = destination(mid, offsetDistance, heading + 90 * direction, {
    units: "kilometers",
  });

  const base = lineString([
    start.geometry.coordinates,
    control.geometry.coordinates,
    end.geometry.coordinates,
  ]);
  const curved = bezierSpline(base, { sharpness: 0.85 });
  return curved.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
};

export const buildScenarioContext = (scenarioId, meshDisplay) => {
  if (!scenarioId || !meshDisplay?.length) {
    return { hotspots: [], lowspots: [], gridCenter: null };
  }

  const sorted = [...meshDisplay].sort((a, b) => b.baseCount - a.baseCount);
  const hotspots = sorted.slice(0, 4).map((cell) => ({
    center: cell.center,
    intensity: cell.baseCount,
  }));
  const lowspots = [...sorted].reverse().slice(0, 4).map((cell) => ({
    center: cell.center,
    intensity: cell.baseCount,
  }));

  const gridCenter = meshDisplay.reduce(
    (acc, cell) => {
      acc.lat += cell.center[0];
      acc.lng += cell.center[1];
      return acc;
    },
    { lat: 0, lng: 0 }
  );
  gridCenter.lat /= meshDisplay.length;
  gridCenter.lng /= meshDisplay.length;

  return { hotspots, lowspots, gridCenter };
};

export const applyScenarioToMeshCount = (count, mesh, scenarioId) => {
  if (!scenarioId) return count;

  switch (scenarioId) {
    case "peak": {
      if (count >= 120) return Math.round(count * 0.72);
      if (count >= 80) return Math.round(count * 0.82);
      return Math.round(count * 0.93);
    }
    case "demand": {
      if (count >= 110) return Math.round(count * 0.8);
      if (count < 60) return Math.round(count * 1.1);
      return Math.round(count * 0.92);
    }
    case "balance": {
      if (mesh.isCore) return Math.round(count * 0.68);
      if (mesh.isEdge) return Math.round(count * 1.15);
      return Math.round(count * 1.05);
    }
    default:
      return count;
  }
};

export const applyScenarioToParking = (
  lot,
  timeIndex,
  scenarioId,
  context = {}
) => {
  let occupancy = lot.occupancy[timeIndex];
  let price = lot.price[timeIndex];

  if (!scenarioId) {
    return { occupancy, price };
  }

  switch (scenarioId) {
    case "peak": {
      const multiplier = peakPriceMultiplier(timeIndex, lot.occupancy.length);
      price *= multiplier;
      const occupancyShift = (multiplier - 1) * 0.35;
      occupancy = clamp(occupancy * (1 - occupancyShift), 0.1, 0.98);
      break;
    }
    case "demand": {
      const multiplier = demandPriceMultiplier(occupancy);
      price *= multiplier;
      const pressure = clamp((occupancy - 0.55) / 0.35, -1, 1);
      occupancy = clamp(occupancy - pressure * 0.06, 0.1, 0.98);
      break;
    }
    case "balance": {
      const hotspots = context.hotspots ?? [];
      if (hotspots.length) {
        const lotPoint = toPoint(lot.position);
        const minDistance = hotspots.reduce((min, hotspot) => {
          const dist = turfDistance(lotPoint, toPoint(hotspot.center), {
            units: "kilometers",
          });
          return Math.min(min, dist);
        }, Infinity);

        if (minDistance <= 0.45) {
          price *= 1.22;
          occupancy *= 0.9;
        } else if (minDistance <= 0.95) {
          price *= 0.88;
          occupancy *= 1.05;
        } else {
          price *= 0.96;
          occupancy *= 1.02;
        }
      } else if (lot.isCore) {
        occupancy *= 0.8;
        price *= 1.25;
      } else {
        occupancy *= 1.05;
        price *= 0.85;
      }
      break;
    }
    default:
      break;
  }

  return {
    occupancy: clamp(occupancy, 0.1, 0.98),
    price: Math.round(price),
  };
};

export const buildFlowLines = (scenarioId, meshDisplay, context = {}) => {
  if (!scenarioId || !meshDisplay?.length) return [];

  const { hotspots, lowspots, gridCenter } = context;

  if (scenarioId === "peak") {
    if (!hotspots?.length || !lowspots?.length) return [];
    return hotspots.slice(0, 3).map((hotspot, index) => {
      const target = lowspots[index % lowspots.length];
      const delta = Math.max(0, Math.round(hotspot.intensity - target.intensity));
      const weight = clamp(delta / 130, 0.45, 1);
      const direction = index % 2 === 0 ? 1 : -1;
      return {
        from: hotspot.center,
        to: target.center,
        path: buildCurvePath(hotspot.center, target.center, 0.25, direction),
        weight,
        color: "#9a4b3a",
        label: "低密度エリアへシフト",
        value: delta,
        trend: "down",
      };
    });
  }

  if (scenarioId === "demand") {
    if (!hotspots?.length || !lowspots?.length) return [];
    return hotspots.slice(0, 2).map((hotspot, index) => {
      const target = lowspots[(index + 1) % lowspots.length];
      const delta = Math.max(0, Math.round(hotspot.intensity - target.intensity));
      const weight = clamp(delta / 140, 0.4, 0.95);
      const direction = index % 2 === 0 ? -1 : 1;
      return {
        from: hotspot.center,
        to: target.center,
        path: buildCurvePath(hotspot.center, target.center, 0.2, direction),
        weight,
        color: "#b08b2a",
        label: "需要に応じた誘導",
        value: delta,
        trend: "down",
      };
    });
  }

  if (scenarioId === "balance") {
    if (!hotspots?.length || !gridCenter) return [];
    const gridPoint = toPoint([gridCenter.lat, gridCenter.lng]);

    return hotspots.slice(0, 4).map((hotspot, index) => {
      const start = toPoint(hotspot.center);
      const heading = bearing(gridPoint, start);
      const end = destination(start, 0.85, heading, { units: "kilometers" });
      const target = [end.geometry.coordinates[1], end.geometry.coordinates[0]];
      const delta = Math.max(0, Math.round(hotspot.intensity - 70));
      const weight = clamp(delta / 120, 0.5, 1.2);
      const direction = index % 2 === 0 ? 1 : -1;
      return {
        from: hotspot.center,
        to: target,
        path: buildCurvePath(hotspot.center, target, 0.28, direction),
        weight,
        color: "#3f7f3b",
        label: "外縁へ再配分",
        value: delta,
        trend: "out",
      };
    });
  }

  return [];
};
