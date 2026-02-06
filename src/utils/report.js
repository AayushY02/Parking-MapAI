import { formatYen } from "../data/mockData";

export const buildReportHtml = ({ scenario, timeLabel, stats, imageDataUrl }) => {
  const ruleItems = scenario
    ? scenario.rules.map((rule) => `<li>${rule}</li>`).join("")
    : "";

  const headline = scenario
    ? `${scenario.title}（${scenario.pattern}）`
    : "ベースラインスナップショット";

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>マップAI レポート - ${timeLabel}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@600;700&family=Zen+Kaku+Gothic+New:wght@400;600&display=swap');
      body { font-family: 'Zen Kaku Gothic New', Arial, sans-serif; margin: 32px; color: #e2e8f0; background: #0b0b0b; }
      h1 { font-family: 'Shippori Mincho B1', serif; }
      h1 { font-size: 28px; margin-bottom: 8px; }
      h2 { font-size: 18px; margin-top: 24px; color: #d1d5db; }
      .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; background: rgba(78, 159, 61, 0.2); font-size: 12px; color: #e2e8f0; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
      .card { border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 12px; background: rgba(15, 15, 15, 0.8); }
      img { max-width: 100%; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); }
      ul { padding-left: 18px; }
      li { margin: 6px 0; }
    </style>
  </head>
  <body>
    <h1>マップAI 動的価格レポート</h1>
    <div class="pill">小樽運河 · ${timeLabel}</div>
    <h2>${headline}</h2>
    <p>${scenario ? scenario.summary : "基準となる混雑と駐車の状態です。"}</p>

    <h2>影響サマリー</h2>
    <div class="grid">
      <div class="card">
        <strong>平均メッシュ密度</strong>
        <div>${stats.avgBefore} → ${stats.avgAfter}</div>
      </div>
      <div class="card">
        <strong>ピークメッシュ密度</strong>
        <div>${stats.peakBefore} → ${stats.peakAfter}</div>
      </div>
      <div class="card">
        <strong>平均駐車稼働率</strong>
        <div>${stats.occupancyBefore}% → ${stats.occupancyAfter}%</div>
      </div>
      <div class="card">
        <strong>平均駐車料金</strong>
        <div>${formatYen(stats.priceBefore)} → ${formatYen(stats.priceAfter)}</div>
      </div>
    </div>

    <h2>適用ルール</h2>
    <ul>
      ${ruleItems}
    </ul>

    <h2>マップスナップショット</h2>
    <img src="${imageDataUrl}" alt="マップのスナップショット" />

    <h2>結果の要約</h2>
    <p>${stats.narrative}</p>
  </body>
</html>`;
};
