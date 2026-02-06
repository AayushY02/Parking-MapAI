import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import ChatPanel from "./components/ChatPanel.jsx";
import MapView from "./components/MapView.jsx";
import { center, meshCells, parkingLots, timeSlots } from "./data/mockData.js";
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
  const mapContainerRef = useRef(null);

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
        ? `Peak density drops by ${peakDrop}%, while average occupancy settles closer to the target band.`
        : "Baseline snapshot collected for comparison.",
    };
  }, [meshDisplay, parkingDisplay, timeIndex, selectedScenario]);

  const handleGenerateReport = async () => {
    if (!selectedScenario || !mapContainerRef.current) return;

    const canvas = await html2canvas(mapContainerRef.current, {
      useCORS: true,
      backgroundColor: "#f8fafc",
      scale: 2,
    });
    const imageDataUrl = canvas.toDataURL("image/png");

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
    link.download = `Map_AI_Report_${timeSlots[timeIndex].replace(":", "")}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (screen === "landing") {
    return (
      <div className="app-shell px-4 py-12 lg:px-10 lg:py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <div className="relative overflow-hidden rounded-[36px] bg-white/85 p-8 shadow-xl sm:p-10">
            <div className="pointer-events-none absolute -right-24 -top-20 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="flex flex-col gap-6">
                <div className="text-xs font-semibold uppercase tracking-[0.5em] text-slate-400">
                  Map AI
                </div>
                <h1 className="hero-title text-4xl leading-tight text-slate-900 lg:text-5xl">
                  Dynamic parking intelligence for Otaru Canal
                </h1>
                <p className="text-sm leading-relaxed text-slate-600">
                  Map AI fuses 250m mesh demand, occupancy, and pricing
                  simulations so planners can reduce over-tourism pressure
                  without sacrificing footfall.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-700"
                    onClick={() => setScreen("future")}
                  >
                    Launch Future Mode
                  </button>
                  <button
                    className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                    onClick={() => setScreen("current")}
                  >
                    View Current Mode
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-xs text-slate-500">
                    <div>Live mesh coverage</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      {meshCells.length} cells
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-xs text-slate-500">
                    <div>Parking inventory</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      {parkingLots.length} lots
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-xs text-slate-500">
                    <div>Update cadence</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      15 min
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Simulation Brief
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    Peak demand arrives between 12:30 and 13:30. Map AI rebalances
                    pricing and flow across the canal spine before congestion spills
                    into residential streets.
                  </div>
                  <div className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-xs text-white">
                    Scenario ready: dynamic pricing waves across {parkingLots.length} lots.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    What You Can Do
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600">
                    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
                      Inspect live mesh density and occupancy changes by 15-minute slice.
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
                      Compare pricing scenarios to find the best congestion relief mix.
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
                      Generate a report with before-and-after impact metrics.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="glass-panel rounded-3xl p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Mesh Intelligence
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                Real-time density heatmaps
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Visualize crowd pressure in 250m grids and surface high-risk pockets
                before they overwhelm the canal core.
              </p>
            </div>
            <div className="glass-panel rounded-3xl p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Pricing Studio
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                Adaptive parking controls
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Model price shifts that smooth demand across lots while protecting
                visitor experience.
              </p>
            </div>
            <div className="glass-panel rounded-3xl p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Flow Orchestration
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                Scenario-driven outcomes
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Tune guidance, wayfinding, and incentives to pull visitors toward
                calmer routes and lots.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "current") {
    return (
      <div className="app-shell px-6 py-16">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white/80 p-10 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
            Map AI
          </div>
          <h1 className="hero-title mt-4 text-3xl text-slate-900">Current Mode</h1>
          <p className="mt-3 text-sm text-slate-600">
            Live feeds are mocked in this prototype. Jump to Future mode to
            explore dynamic pricing simulations.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
              onClick={() => setScreen("landing")}
            >
              Back
            </button>
            <button
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-700"
              onClick={() => setScreen("future")}
            >
              Go to Future
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
            }
          }}
          selectedScenario={selectedScenario}
          onSelectScenario={(scenario) => {
            setSelectedScenario(scenario);
            setSelectedMethod("pricing");
          }}
          timeLabel={timeSlots[timeIndex]}
          onExit={() => setScreen("landing")}
        />

        <div className="map-shell min-h-0 overflow-hidden rounded-3xl">
          <MapView
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
    </div>
  );
};

export default App;
