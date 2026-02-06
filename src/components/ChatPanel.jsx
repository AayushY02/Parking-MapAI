import clsx from "clsx";
import { scenarioCases } from "../data/mockData";

const ChatBubble = ({ tone = "system", children }) => (
  <div
    className={clsx(
      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
      tone === "system"
        ? "self-start border border-white/10 bg-[#141414]/90 text-slate-200"
        : "self-end border border-[#4E9F3D]/25 bg-[#151515]/90 text-slate-200"
    )}
  >
    {children}
  </div>
);

const SuggestionButton = ({ label, onClick }) => (
  <button
    className="w-full rounded-full border border-white/10 bg-[#141414]/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:-translate-y-0.5 hover:border-[#4E9F3D]/60 hover:bg-[#171717]/95"
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
        ? "border-[#4E9F3D]/45 bg-[#161c16]/90 text-slate-100 shadow-md"
        : "border-white/10 bg-[#131313]/90 text-slate-300 hover:-translate-y-0.5 hover:bg-[#161616]/95"
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
        ? "border-[#4E9F3D]/45 bg-[#161c16]/90 text-slate-100 shadow-md"
        : "border-white/10 bg-[#131313]/90 text-slate-300 hover:-translate-y-0.5 hover:bg-[#161616]/95"
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
  <div className="panel-scroll max-h-[40dvh] overflow-y-auto rounded-2xl border border-white/10 bg-[#121212]/90 p-4 shadow-sm lg:max-h-[45%]">
    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
      <span>セッション操作</span>
      <button
        className="rounded-full border border-white/10 bg-[#141414]/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:-translate-y-0.5 hover:border-[#4E9F3D]/60"
        onClick={onExit}
        type="button"
      >
        終了
      </button>
    </div>
    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-300">
      <span className="rounded-full border border-white/10 bg-[#141414]/90 px-3 py-1">
        小樽運河
      </span>
      <span className="rounded-full border border-white/10 bg-[#141414]/90 px-3 py-1">
        未来モード
      </span>
      <span className="rounded-full border border-white/10 bg-[#141414]/90 px-3 py-1">
        時刻 {timeLabel}
      </span>
    </div>

    <div className="mt-4 space-y-3">
      {!showTimeline && (
        <SuggestionButton label="何が起きる？" onClick={onShowTimeline} />
      )}

      {showTimeline && !showFixOptions && (
        <SuggestionButton
          label="混雑をどう改善する？"
          onClick={onShowFixOptions}
        />
      )}

      {showFixOptions && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            方法を選択
          </div>
          <MethodCard
            title="動的価格"
            description="時間・需要・エリアで価格を調整し、流入を平準化。"
            active={selectedMethod === "pricing"}
            onClick={() => onSelectMethod("pricing")}
          />
          <MethodCard
            title="誘導ウェイファインディング"
            description="静かなルートやシャトル導線へ誘導。"
            active={selectedMethod === "wayfinding"}
            onClick={() => onSelectMethod("wayfinding")}
          />
        </div>
      )}

      {selectedMethod === "pricing" && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            動的価格シナリオ
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
      "glass-panel flex h-full min-h-0 w-full flex-col gap-4 rounded-3xl p-5 text-slate-200",
      className
    )}
  >
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="panel-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl bg-[#101010]/90 p-4 shadow-inner">
        <ChatBubble tone="system">
          運河中心部の混雑が高まっています。未来の混雑と価格のシミュレーションを開始できます。
        </ChatBubble>
        <ChatBubble tone="user">13:00のスナップショットを見せて。</ChatBubble>
        <ChatBubble tone="system">
          ベースラインを読み込みました。駐車稼働率は許容帯を上回っています。
        </ChatBubble>

        {showTimeline && (
          <ChatBubble tone="system">
            タイムラインをドラッグして15分ごとの変化を確認できます。現在: {timeLabel}。
          </ChatBubble>
        )}

        {selectedMethod === "wayfinding" && (
          <ChatBubble tone="system">
            誘導パターンを準備中です。詳細シミュレーションは動的価格でご覧ください。
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
      className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111111]/90 px-3 py-2 shadow-sm"
      onSubmit={(event) => event.preventDefault()}
    >
      <input
        className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
        placeholder="マップAIに混雑パターンを質問..."
      />
      <button
        type="submit"
        className="rounded-full bg-[#4E9F3D]/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#0b140c] transition hover:bg-[#4E9F3D] leading-none"
      >
        送信
      </button>
    </form>
  </div>
);

export default ChatPanel;
