import clsx from "clsx";
import { scenarioCases } from "../data/mockData";

const ChatBubble = ({ tone = "system", children }) => (
  <div
    className={clsx(
      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
      tone === "system"
        ? "self-start bg-slate-900 text-white"
        : "self-end border border-slate-200/80 bg-white text-slate-700"
    )}
  >
    {children}
  </div>
);

const SuggestionButton = ({ label, onClick }) => (
  <button
    className="w-full rounded-full border border-emerald-200/80 bg-emerald-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"
    onClick={onClick}
  >
    {label}
  </button>
);

const MethodCard = ({ title, description, active, onClick }) => (
  <button
    className={clsx(
      "w-full rounded-2xl border px-4 py-3 text-left text-sm transition",
      active
        ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
        : "border-slate-200/80 bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow-sm"
    )}
    onClick={onClick}
  >
    <div className="text-sm font-semibold">{title}</div>
    <div className="mt-1 text-xs opacity-80">{description}</div>
  </button>
);

const ScenarioOption = ({ scenario, active, onClick }) => (
  <button
    className={clsx(
      "w-full rounded-2xl border px-4 py-3 text-left text-sm transition",
      active
        ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
        : "border-slate-200/80 bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow-sm"
    )}
    onClick={onClick}
  >
    <div className="text-sm font-semibold">{scenario.title}</div>
    <div className="mt-1 text-xs opacity-80">{scenario.pattern}</div>
  </button>
);

const ActionPanel = ({
  showTimeline,
  onShowTimeline,
  showFixOptions,
  onShowFixOptions,
  selectedMethod,
  onSelectMethod,
  selectedScenario,
  onSelectScenario,
  timeLabel,
  onExit,
}) => (
  <div className="panel-scroll max-h-[40dvh] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm lg:max-h-[45%]">
    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
      <span>Session Controls</span>
      <button
        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-300"
        onClick={onExit}
        type="button"
      >
        Exit
      </button>
    </div>
    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
      <span className="rounded-full border border-slate-200/80 bg-white px-3 py-1">
        Otaru Canal
      </span>
      <span className="rounded-full border border-slate-200/80 bg-white px-3 py-1">
        Future Mode
      </span>
      <span className="rounded-full border border-slate-200/80 bg-white px-3 py-1">
        Time {timeLabel}
      </span>
    </div>

    <div className="mt-4 space-y-3">
      {!showTimeline && (
        <SuggestionButton label="What would happen?" onClick={onShowTimeline} />
      )}

      {showTimeline && !showFixOptions && (
        <SuggestionButton
          label="How to fix this congestion"
          onClick={onShowFixOptions}
        />
      )}

      {showFixOptions && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Choose a method
          </div>
          <MethodCard
            title="Dynamic pricing"
            description="Adjust prices by time, demand, and area to smooth traffic."
            active={selectedMethod === "pricing"}
            onClick={() => onSelectMethod("pricing")}
          />
          <MethodCard
            title="Guided wayfinding"
            description="Push visitors to quieter routes and shuttle zones."
            active={selectedMethod === "wayfinding"}
            onClick={() => onSelectMethod("wayfinding")}
          />
        </div>
      )}

      {selectedMethod === "pricing" && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Dynamic pricing cases
          </div>
          {scenarioCases.map((scenario) => (
            <ScenarioOption
              key={scenario.id}
              scenario={scenario}
              active={selectedScenario?.id === scenario.id}
              onClick={() => onSelectScenario(scenario)}
            />
          ))}
        </div>
      )}
    </div>
  </div>
);

const ChatPanel = ({
  showTimeline,
  onShowTimeline,
  showFixOptions,
  onShowFixOptions,
  selectedMethod,
  onSelectMethod,
  selectedScenario,
  onSelectScenario,
  timeLabel,
  className,
  onExit,
}) => (
  <div
    className={clsx(
      "glass-panel flex h-full min-h-0 w-full flex-col gap-4 rounded-3xl p-5 text-slate-700",
      className
    )}
  >
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="panel-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl bg-white/70 p-4 shadow-inner">
        <ChatBubble tone="system">
          The canal core is approaching crowd pressure. We can simulate future
          congestion and pricing responses.
        </ChatBubble>
        <ChatBubble tone="user">Show me the 1pm snapshot.</ChatBubble>
        <ChatBubble tone="system">
          Baseline loaded. Parking occupancy is trending above the comfort band.
        </ChatBubble>

        {showTimeline && (
          <ChatBubble tone="system">
            Drag the timeline to watch congestion shift every 15 minutes. Current: {timeLabel}.
          </ChatBubble>
        )}

        {selectedMethod === "wayfinding" && (
          <ChatBubble tone="system">
            Wayfinding patterns are queued. Switch to dynamic pricing for the detailed simulation.
          </ChatBubble>
        )}
      </div>

      <ActionPanel
        showTimeline={showTimeline}
        onShowTimeline={onShowTimeline}
        showFixOptions={showFixOptions}
        onShowFixOptions={onShowFixOptions}
        selectedMethod={selectedMethod}
        onSelectMethod={onSelectMethod}
        selectedScenario={selectedScenario}
        onSelectScenario={onSelectScenario}
        timeLabel={timeLabel}
        onExit={onExit}
      />
    </div>

    <form
      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
      onSubmit={(event) => event.preventDefault()}
    >
      <input
        className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
        placeholder="Ask Map AI about congestion patterns..."
      />
      <button
        type="submit"
        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-emerald-700"
      >
        Send
      </button>
    </form>
  </div>
);

export default ChatPanel;
