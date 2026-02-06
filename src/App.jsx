import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import ChatPanel from "./components/ChatPanel.jsx";
import HeroScene from "./components/HeroScene.jsx";
import MapView from "./components/MapView.jsx";
import {
  center,
  meshCells,
  parkingLots,
  scenarioCases,
  timeSlots,
} from "./data/mockData.js";
import {
  applyScenarioToMeshCount,
  applyScenarioToParking,
  buildFlowLines,
  buildScenarioContext,
} from "./utils/scenario.js";
import { buildReportHtml } from "./utils/report.js";

const average = (values) =>
  Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

const App = () => {
  const [screen, setScreen] = useState("landing");
  const [timeIndex, setTimeIndex] = useState(8);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showFixOptions, setShowFixOptions] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [showScenarioDialog, setShowScenarioDialog] = useState(false);
  const [mapPreviewUrl, setMapPreviewUrl] = useState("");
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (screen !== "landing") return;
    const elements = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.2 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [screen]);

  const meshDisplay = useMemo(() => {
    return meshCells.map((mesh) => {
      const baseCount = mesh.counts[timeIndex];
      const count = applyScenarioToMeshCount(
        baseCount,
        mesh,
        selectedScenario?.id
      );
      return { ...mesh, count, baseCount };
    });
  }, [timeIndex, selectedScenario]);

  const scenarioContext = useMemo(
    () => buildScenarioContext(selectedScenario?.id, meshDisplay),
    [selectedScenario, meshDisplay]
  );

  const parkingDisplay = useMemo(() => {
    return parkingLots.map((lot) => {
      const baseOcc = lot.occupancy[timeIndex];
      const basePrice = lot.price[timeIndex];
      const { occupancy, price } = applyScenarioToParking(
        lot,
        timeIndex,
        selectedScenario?.id,
        scenarioContext
      );
      return {
        ...lot,
        occupancyValue: occupancy,
        priceValue: price,
        baseOcc,
        basePrice,
      };
    });
  }, [timeIndex, selectedScenario, scenarioContext]);

  const flowLines = useMemo(
    () => buildFlowLines(selectedScenario?.id, meshDisplay, scenarioContext),
    [selectedScenario, meshDisplay, scenarioContext]
  );

  const reportStats = useMemo(() => {
    const meshBase = meshCells.map((mesh) => mesh.counts[timeIndex]);
    const meshScenario = meshDisplay.map((mesh) => mesh.count);
    const occBase = parkingLots.map((lot) => lot.occupancy[timeIndex] * 100);
    const occScenario = parkingDisplay.map(
      (lot) => lot.occupancyValue * 100
    );
    const priceBase = parkingLots.map((lot) => lot.price[timeIndex]);
    const priceScenario = parkingDisplay.map((lot) => lot.priceValue);

    const avgBefore = average(meshBase);
    const avgAfter = average(meshScenario);
    const peakBefore = Math.max(...meshBase);
    const peakAfter = Math.max(...meshScenario);
    const occupancyBefore = average(occBase);
    const occupancyAfter = average(occScenario);
    const priceBefore = average(priceBase);
    const priceAfter = average(priceScenario);

    const peakDrop = Math.max(
      0,
      Math.round(((peakBefore - peakAfter) / peakBefore) * 100)
    );

    return {
      avgBefore,
      avgAfter,
      peakBefore,
      peakAfter,
      occupancyBefore,
      occupancyAfter,
      priceBefore,
      priceAfter,
      narrative: selectedScenario
        ? `ピーク密度は${peakDrop}%低下し、平均稼働率は目標帯に近づきました。`
        : "比較用のベースラインスナップショットを取得しました。",
    };
  }, [meshDisplay, parkingDisplay, timeIndex, selectedScenario]);

  const captureMapPreview = () => {
    try {
      const mapInstance = mapRef.current?.getMap?.() ?? mapRef.current;
      const mapCanvas = mapInstance?.getCanvas?.();
      if (mapCanvas) {
        return mapCanvas.toDataURL("image/png");
      }
    } catch (error) {
      console.warn("Map preview capture failed.", error);
    }
    return "";
  };

  const handleOpenScenarioDialog = () => {
    const preview = captureMapPreview();
    setMapPreviewUrl(preview);
    setShowScenarioDialog(true);
  };

  const handleSelectScenario = (scenario) => {
    setSelectedScenario(scenario);
    setSelectedMethod("pricing");
    setShowScenarioDialog(false);
  };

  const handleGenerateReport = async () => {
    if (!selectedScenario || !mapContainerRef.current) return;

    let imageDataUrl = "";
    try {
      const mapInstance = mapRef.current?.getMap?.() ?? mapRef.current;
      const mapCanvas = mapInstance?.getCanvas?.();
      if (mapCanvas) {
        imageDataUrl = mapCanvas.toDataURL("image/png");
      }
    } catch (error) {
      console.warn("Map capture failed, fallback to html2canvas.", error);
    }

    if (!imageDataUrl) {
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        backgroundColor: "#0b0b0b",
        scale: 2,
      });
      imageDataUrl = canvas.toDataURL("image/png");
    }

    const reportHtml = buildReportHtml({
      scenario: selectedScenario,
      timeLabel: timeSlots[timeIndex],
      stats: reportStats,
      imageDataUrl,
    });

    const blob = new Blob([reportHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `MapAI_レポート_${timeSlots[timeIndex].replace(":", "")}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (screen === "landing") {
    return (
      <div className="app-shell landing px-4 py-10 lg:px-12 lg:py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <section className="hero-shell">
            <div className="hero-grid">
              <div className="flex flex-col gap-6" data-reveal>
                <div className="hero-kicker">マップAI</div>
                <h1 className="hero-title text-4xl leading-tight text-slate-50 lg:text-5xl">
                  小樽運河の混雑を、光で読む。
                </h1>
                <p className="text-sm leading-relaxed text-slate-300">
                  250mメッシュの需要・稼働率・価格シミュレーションを重ね、
                  観光圧を抑えながら滞在体験の質を保ちます。
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="hero-cta"
                    onClick={() => setScreen("future")}
                  >
                    未来モードを起動
                  </button>
                  <button
                    className="hero-ghost"
                    onClick={() => setScreen("current")}
                  >
                    現在モードを見る
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="metric-card">
                    <div>ライブメッシュ監視</div>
                    <div className="metric-value">{meshCells.length} セル</div>
                  </div>
                  <div className="metric-card">
                    <div>駐車場インベントリ</div>
                    <div className="metric-value">{parkingLots.length} 箇所</div>
                  </div>
                  <div className="metric-card">
                    <div>更新間隔</div>
                    <div className="metric-value">15 分</div>
                  </div>
                </div>
              </div>

              <div className="hero-visual" data-reveal style={{ transitionDelay: "120ms" }}>
                <HeroScene />
                <div className="hero-glow" />
                {/* <div className="hero-card">
                  <div className="hero-card-title">シミュレーション概況</div>
                  <p className="text-xs text-slate-300">
                    12:30〜13:30に需要が最大化。価格と誘導の組み合わせで
                    住宅地への溢れを先回りで抑制します。
                  </p>
                  <div className="hero-card-badge">
                    シナリオ準備完了：{parkingLots.length}拠点で動的価格波を適用
                  </div>
                </div> */}
                {/* <div className="hero-card mini" style={{ bottom: "8%", right: "8%" }}>
                  <div className="hero-card-title">体験の流れ</div>
                  <p className="text-xs text-slate-300">
                    時系列をスライドして、密度の変化と流動矢印を比較。
                  </p>
                </div> */}
              </div>
            </div>
          </section>

          <div className="ticker" data-reveal>
            <div className="ticker-track">
              <span>密度</span>
              <span>稼働率</span>
              <span>価格</span>
              <span>流動</span>
              <span>体験</span>
              <span>ガイダンス</span>
              <span>混雑緩和</span>
              <span>密度</span>
              <span>稼働率</span>
              <span>価格</span>
              <span>流動</span>
              <span>体験</span>
              <span>ガイダンス</span>
              <span>混雑緩和</span>
            </div>
          </div>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="glass-panel feature-card" data-reveal>
              <div className="feature-kicker">メッシュインサイト</div>
              <div className="feature-title">リアルタイム密度ヒート</div>
              <p className="feature-body">
                250mグリッドで混雑の波を可視化し、危険ゾーンを先に検出。
              </p>
            </div>
            <div
              className="glass-panel feature-card"
              data-reveal
              style={{ transitionDelay: "120ms" }}
            >
              <div className="feature-kicker">価格スタジオ</div>
              <div className="feature-title">適応型の価格制御</div>
              <p className="feature-body">
                需要に合わせた価格調整で、満車圧力を滑らかに分散。
              </p>
            </div>
            <div
              className="glass-panel feature-card"
              data-reveal
              style={{ transitionDelay: "240ms" }}
            >
              <div className="feature-kicker">フロー設計</div>
              <div className="feature-title">シナリオ駆動の誘導</div>
              <p className="feature-body">
                矢印とベクトルで人流の向きを可視化し、ルート戦略を更新。
              </p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="glass-panel story-card" data-reveal>
              <div className="feature-kicker">できること</div>
              <div className="feature-title">未来の混雑を安全に試す</div>
              <p className="feature-body">
                タイムライン、価格シナリオ、誘導を組み合わせて
                小樽運河のピーク帯を仮想で調整できます。
              </p>
              <div className="story-grid">
                <div className="story-item">15分刻みの変化をスクロールで追跡</div>
                <div className="story-item">価格差と稼働差を一目で比較</div>
                <div className="story-item">レポートで施策前後を共有</div>
              </div>
            </div>
            <div
              className="glass-panel story-card"
              data-reveal
              style={{ transitionDelay: "120ms" }}
            >
              <div className="feature-kicker">モード切替</div>
              <div className="feature-title">いま/未来の切替が即時</div>
              <p className="feature-body">
                現在モードでは実運用を想定、未来モードでは施策を試算。
              </p>
              <div className="story-grid">
                <div className="story-item">現在モード：現状の混雑を確認</div>
                <div className="story-item">未来モード：施策を試して比較</div>
              </div>
              <button className="hero-cta mt-4" onClick={() => setScreen("future")}>
                未来モードへ
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (screen === "current") {
    return (
      <div className="app-shell px-6 py-16">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[#0b0b0b]/85 p-10 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
            マップAI
          </div>
          <h1 className="hero-title mt-4 text-3xl text-slate-50">現在モード</h1>
          <p className="mt-3 text-sm text-slate-300">
            このプロトタイプではライブデータを模擬しています。未来モードで
            動的価格シミュレーションを確認できます。
          </p>
          <div className="mt-6 flex gap-3">
            <button
              className="hero-ghost"
              onClick={() => setScreen("landing")}
            >
              戻る
            </button>
            <button
              className="hero-cta"
              onClick={() => setScreen("future")}
            >
              未来モードへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell h-[100dvh] px-4 py-4 lg:px-6 lg:py-6">
      <div className="grid h-full min-h-0 grid-rows-[minmax(280px,40dvh)_1fr] gap-4 lg:grid-cols-[360px_1fr] lg:grid-rows-1 lg:gap-6">
        <ChatPanel
          className="min-h-0"
          showTimeline={showTimeline}
          onShowTimeline={() => setShowTimeline(true)}
          showFixOptions={showFixOptions}
          onShowFixOptions={() => setShowFixOptions(true)}
          selectedMethod={selectedMethod}
          onSelectMethod={(method) => {
            setSelectedMethod(method);
            if (method !== "pricing") {
              setSelectedScenario(null);
              setShowScenarioDialog(false);
              return;
            }
            handleOpenScenarioDialog();
          }}
          selectedScenario={selectedScenario}
          timeLabel={timeSlots[timeIndex]}
          onOpenScenarioDialog={handleOpenScenarioDialog}
          onExit={() => setScreen("landing")}
        />

        <div className="map-shell min-h-0 overflow-hidden rounded-3xl">
          <MapView
            mapRef={mapRef}
            mapContainerRef={mapContainerRef}
            center={center}
            meshDisplay={meshDisplay}
            parkingDisplay={parkingDisplay}
            timeSlots={timeSlots}
            timeIndex={timeIndex}
            showTimeline={showTimeline}
            onTimeChange={setTimeIndex}
            flowLines={flowLines}
            scenario={selectedScenario}
            onGenerateReport={handleGenerateReport}
            meshCount={meshCells.length}
            parkingCount={parkingLots.length}
            timeLabel={timeSlots[timeIndex]}
          />
        </div>
      </div>

      {showScenarioDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-6"
          onClick={() => setShowScenarioDialog(false)}
        >
          <div
            className="glass-panel w-full max-w-[640px] rounded-3xl border border-white/10 bg-[#0f0f0f]/95 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                  動的価格シナリオ
                </div>
                <div className="mt-1 text-xl font-semibold text-slate-50">ケースを選択</div>
                <div className="mt-1 text-xs text-slate-400">
                  それぞれの施策でマップの流れを比較できます。
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScenarioDialog(false)}
                className="rounded-full bg-[#1f1f1f] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:bg-[#242424]"
              >
                閉じる
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {scenarioCases.map((scenario) => {
                const isActive = selectedScenario?.id === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => handleSelectScenario(scenario)}
                    className={`group w-full overflow-hidden rounded-2xl border text-left transition ${
                      isActive
                        ? "border-[#4E9F3D] bg-[#141414] text-white ring-1 ring-[#4E9F3D]/40"
                        : "border-white/10 bg-[#1a1a1a] text-slate-200 hover:border-[#4E9F3D]/40 hover:bg-[#1f1f1f]"
                    }`}
                  >
                    <div className="relative h-32 w-full overflow-hidden">
                      {mapPreviewUrl ? (
                        <img
                          src={mapPreviewUrl}
                          alt={`${scenario.title} プレビュー`}
                          className="h-full w-full object-cover opacity-85 transition group-hover:opacity-95"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-slate-500">
                          プレビューなし
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[9px] uppercase tracking-[0.3em] text-slate-200">
                        Case {scenario.id}
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">{scenario.title}</div>
                        {isActive && (
                          <span className="rounded-full bg-[#4E9F3D] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.25em] text-black">
                            選択中
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{scenario.pattern}</div>
                      <div className="mt-2 text-[11px] text-slate-400 line-clamp-2">
                        {scenario.summary}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
