const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const center = {
  lat: 43.1982,
  lng: 140.9991,
};

export const timeSlots = [
  "11:00",
  "11:15",
  "11:30",
  "11:45",
  "12:00",
  "12:15",
  "12:30",
  "12:45",
  "13:00",
  "13:15",
  "13:30",
  "13:45",
  "14:00",
  "14:15",
  "14:30",
];

const timeWeights = timeSlots.map((_, index) => {
  const t = index / (timeSlots.length - 1);
  const peak = Math.exp(-Math.pow((t - 0.55) / 0.25, 2));
  const shoulder = 0.12 * Math.sin(t * Math.PI * 2);
  return clamp(0.42 + 0.65 * peak + shoulder, 0.35, 1.05);
});

const seeded = (seed) => {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const toKeySeed = (text) =>
  text
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

const generateMeshGrid = (centerPoint, rows, cols, sizeMeters = 250) => {
  const latDelta = sizeMeters / 111000;
  const lonDelta = sizeMeters / (111000 * Math.cos((centerPoint.lat * Math.PI) / 180));
  const startLat = centerPoint.lat - (rows / 2) * latDelta;
  const startLng = centerPoint.lng - (cols / 2) * lonDelta;
  const cells = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const lat = startLat + row * latDelta;
      const lng = startLng + col * lonDelta;
      const polygon = [
        [lat, lng],
        [lat + latDelta, lng],
        [lat + latDelta, lng + lonDelta],
        [lat, lng + lonDelta],
      ];
      cells.push({
        id: `M-${row}-${col}`,
        row,
        col,
        polygon,
        center: [lat + latDelta / 2, lng + lonDelta / 2],
      });
    }
  }
  return cells;
};

const meshRows = 24;
const meshCols = 24;
const meshBase = generateMeshGrid(center, meshRows, meshCols, 250);
const gridCenter = { row: (meshRows - 1) / 2, col: (meshCols - 1) / 2 };
const maxDist = Math.hypot(gridCenter.row, gridCenter.col);
const hotspotSeed = seeded(9021);
const gaussian = (distance, spread) =>
  Math.exp(-(distance * distance) / (2 * spread * spread));
const hotspots = Array.from({ length: 4 }, () => {
  const row = clamp(
    gridCenter.row + (hotspotSeed() - 0.5) * meshRows * 0.6,
    0,
    meshRows - 1
  );
  const col = clamp(
    gridCenter.col + (hotspotSeed() - 0.5) * meshCols * 0.6,
    0,
    meshCols - 1
  );
  const spread = 2.6 + hotspotSeed() * 4.4;
  const power = 0.55 + hotspotSeed() * 0.6;
  return { row, col, spread, power };
});

export const meshCells = meshBase.map((cell) => {
  const distance = Math.hypot(cell.row - gridCenter.row, cell.col - gridCenter.col);
  const coreFactor = clamp(1 - distance / (maxDist * 0.95), 0.08, 1);
  const corridorFactor =
    0.6 +
    0.4 *
      Math.exp(
        -Math.pow((cell.col - gridCenter.col) / (meshCols * 0.18), 2)
      );
  const hotspotFactor = hotspots.reduce((sum, hotspot) => {
    const dist = Math.hypot(cell.row - hotspot.row, cell.col - hotspot.col);
    return sum + hotspot.power * gaussian(dist, hotspot.spread);
  }, 0);
  const hotspotBlend = clamp(hotspotFactor / 1.7, 0, 1);
  const base =
    35 +
    165 *
      clamp(0.55 * coreFactor + 0.45 * hotspotBlend, 0.1, 1) *
      corridorFactor;
  const seed = seeded(toKeySeed(cell.id) * 19);
  const bias = 1 + (seed() - 0.5) * 0.2;
  const ripple = (seed() - 0.5) * 0.12;
  const timeSeed = seeded(toKeySeed(cell.id) * 131);
  const counts = timeWeights.map((weight, index) => {
    const t = (index / (timeWeights.length - 1)) * Math.PI * 2;
    const wave =
      1 +
      0.1 * Math.sin(t + cell.row * 0.24 + ripple) +
      0.06 * Math.cos(t * 1.4 + cell.col * 0.2);
    const noise = (timeSeed() - 0.5) * 22;
    return Math.round(clamp(base * weight * bias * wave + noise, 12, 230));
  });

  const ringCutoff = maxDist * 0.45;
  const edgeCutoff = maxDist * 0.75;

  return {
    ...cell,
    counts,
    isCore: distance < ringCutoff,
    isEdge: distance > edgeCutoff,
    label: distance < ringCutoff ? "Canal Core" : distance > edgeCutoff ? "Outer Fringe" : "Canal Ring",
  };
});

const lotNamePrefixes = [
  "Canal",
  "Market",
  "Warehouse",
  "Harbor",
  "Station",
  "Promenade",
  "Heritage",
  "Bridge",
  "Unga",
  "Historic",
  "Pier",
  "North",
  "South",
  "East",
  "West",
];

const lotNameSuffixes = [
  "Lot",
  "Deck",
  "Terrace",
  "Hub",
  "Gate",
  "Square",
  "Yard",
  "Garage",
];

const createParkingLots = (count) => {
  const lots = [];
  const rand = seeded(4217);
  const maxRadius = 0.026;

  for (let i = 0; i < count; i += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * maxRadius;
    const latOffset = Math.cos(angle) * radius;
    const lngOffset = Math.sin(angle) * radius * 1.25;

    const capacity = Math.round(60 + rand() * 160);
    const basePrice = Math.round(220 + rand() * 220);
    const prefix = lotNamePrefixes[i % lotNamePrefixes.length];
    const suffix = lotNameSuffixes[(i + 3) % lotNameSuffixes.length];

    lots.push({
      id: `P-${String(i + 1).padStart(2, "0")}`,
      name: `${prefix} ${suffix}`,
      offset: [latOffset, lngOffset],
      capacity,
      basePrice,
    });
  }

  return lots;
};

const parkingSeeds = createParkingLots(60);

export const parkingLots = parkingSeeds.map((lot) => {
  const lat = center.lat + lot.offset[0];
  const lng = center.lng + lot.offset[1];
  const distance = Math.hypot(lot.offset[0], lot.offset[1] / 1.25);
  const distFactor = clamp(1 - distance / 0.028, 0.25, 1);
  const seed = seeded(toKeySeed(lot.id) * 13);
  const bias = 0.85 + seed() * 0.3;
  const waveShift = seed() * Math.PI * 2;
  const occupancy = timeWeights.map((weight, index) => {
    const t = (index / (timeWeights.length - 1)) * Math.PI * 2;
    const rhythm =
      1 + 0.08 * Math.sin(t + waveShift) + 0.05 * Math.cos(t * 1.6 + waveShift);
    const noise = (seed() - 0.5) * 0.12;
    const base = (0.28 + distFactor * 0.6) * bias;
    return clamp(base * weight * rhythm + noise, 0.12, 0.98);
  });
  const price = occupancy.map((occ, index) => {
    const surge = (occ - 0.45) * 420;
    return Math.round(lot.basePrice + surge + (index >= 6 && index <= 9 ? 60 : 0));
  });

  return {
    ...lot,
    position: [lat, lng],
    occupancy,
    price,
    isCore: distance < 0.008,
  };
});

export const scenarioCases = [
  {
    id: "peak",
    title: "Peak Hours Pricing",
    pattern: "Midday surge / morning relief",
    summary:
      "Midday prices climb to cool peak congestion while morning rates soften to encourage early arrivals.",
    rules: [
      "Midday window (12:15–13:30) runs a premium uplift",
      "Morning window (11:00–11:45) runs a softer rate",
      "Occupancy colors drift to show redistribution",
    ],
  },
  {
    id: "demand",
    title: "Demand-Based Pricing",
    pattern: "Live occupancy response",
    summary:
      "Prices flex with current occupancy, nudging drivers away from full lots toward quieter blocks.",
    rules: [
      "High-occupancy lots get a price boost",
      "Low-occupancy lots receive a discount",
      "Changes animate over ~1 second",
    ],
  },
  {
    id: "balance",
    title: "Area-Based Redistribution",
    pattern: "Hotspot buffering",
    summary:
      "Hotspot-adjacent lots go premium while surrounding areas discount to pull vehicles outward.",
    rules: [
      "Hotspot-adjacent parking gets a price lift",
      "Surrounding areas receive a lower price band",
      "Outbound arrows visualize redistribution",
    ],
  },
];

export const formatYen = (value) => `¥${value.toLocaleString("ja-JP")}`;

export const getOccupancyBand = (percentage) => {
  if (percentage >= 0.8) return "high";
  if (percentage >= 0.55) return "mid";
  return "low";
};

export const getMeshBand = (count) => {
  if (count >= 110) return "high";
  if (count >= 70) return "mid";
  return "low";
};

export const meshBandColors = {
  high: "#f97316",
  mid: "#facc15",
  low: "#22c55e",
};

export const occupancyColors = {
  high: "#ef4444",
  mid: "#facc15",
  low: "#22c55e",
};

export { clamp };
