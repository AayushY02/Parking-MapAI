import { formatYen } from "../data/mockData";

export const buildReportHtml = ({ scenario, timeLabel, stats, imageDataUrl }) => {
  const ruleItems = scenario
    ? scenario.rules.map((rule) => `<li>${rule}</li>`).join("")
    : "";

  const headline = scenario
    ? `${scenario.title} (${scenario.pattern})`
    : "Baseline Snapshot";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Map AI Report - ${timeLabel}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600&display=swap');
      body { font-family: 'Manrope', Arial, sans-serif; margin: 32px; color: #0f172a; }
      h1 { font-family: 'Cormorant Garamond', serif; }
      h1 { font-size: 28px; margin-bottom: 8px; }
      h2 { font-size: 18px; margin-top: 24px; }
      .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #e2e8f0; font-size: 12px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
      .card { border: 1px solid #cbd5f5; border-radius: 12px; padding: 12px; background: #f8fafc; }
      img { max-width: 100%; border-radius: 16px; border: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <h1>Map AI Dynamic Pricing Report</h1>
    <div class="pill">Otaru Canal · ${timeLabel}</div>
    <h2>${headline}</h2>
    <p>${scenario ? scenario.summary : "Baseline congestion and parking conditions."}</p>

    <h2>Impact Snapshot</h2>
    <div class="grid">
      <div class="card">
        <strong>Average Mesh Density</strong>
        <div>${stats.avgBefore} → ${stats.avgAfter}</div>
      </div>
      <div class="card">
        <strong>Peak Mesh Density</strong>
        <div>${stats.peakBefore} → ${stats.peakAfter}</div>
      </div>
      <div class="card">
        <strong>Avg. Parking Occupancy</strong>
        <div>${stats.occupancyBefore}% → ${stats.occupancyAfter}%</div>
      </div>
      <div class="card">
        <strong>Avg. Parking Price</strong>
        <div>${formatYen(stats.priceBefore)} → ${formatYen(stats.priceAfter)}</div>
      </div>
    </div>

    <h2>Applied Rules</h2>
    <ul>
      ${ruleItems}
    </ul>

    <h2>Map Snapshot</h2>
    <img src="${imageDataUrl}" alt="Map snapshot" />

    <h2>Outcome Narrative</h2>
    <p>${stats.narrative}</p>
  </body>
</html>`;
};
