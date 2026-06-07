import { useEffect, useMemo, useState } from "react";

/**
 * 双 Agent 可视化遮罩（思考态）
 * 两位 Agent 并行"思考"——呼吸光晕、文字逐字浮现、思考点律动
 */

type AgentStep = {
  agent: "poi" | "story";
  text: string;
  duration: number; // ms
};

const SCRIPT: AgentStep[] = [
  { agent: "poi", text: "读取你的人设关键词", duration: 1500 },
  { agent: "story", text: "感受今日情绪基调", duration: 1500 },
  { agent: "poi", text: "在 3 公里内扫描候选 POI", duration: 2000 },
  { agent: "story", text: "构思故事开场白", duration: 1900 },
  { agent: "poi", text: "筛选符合人设气质的小店", duration: 1800 },
  { agent: "story", text: "设计情绪起承转合曲线", duration: 1700 },
  { agent: "poi", text: "按动线优化访问顺序", duration: 1700 },
  { agent: "story", text: "为每一站编织叙事钩子", duration: 1800 },
  { agent: "poi", text: "标注预约 / 限时点位", duration: 1400 },
  { agent: "story", text: "打磨结语与情绪落点", duration: 1600 },
  { agent: "poi", text: "路线马上就绪", duration: 1000 },
  { agent: "story", text: "剧本即将完成", duration: 1000 },
];

type LogLine = { id: number; agent: "poi" | "story"; text: string; done: boolean; final?: boolean };

const POI_COLOR = "oklch(0.62 0.13 18)";
const STORY_COLOR = "oklch(0.62 0.12 70)";

export function DualAgentOverlay({ visible }: { visible: boolean }) {
  const [poiLogs, setPoiLogs] = useState<LogLine[]>([]);
  const [storyLogs, setStoryLogs] = useState<LogLine[]>([]);
  const [poiActive, setPoiActive] = useState(false);
  const [storyActive, setStoryActive] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPoiLogs([]);
      setStoryLogs([]);
      setPoiActive(false);
      setStoryActive(false);
      return;
    }
    let cancelled = false;
    let id = 0;

    async function run() {
      const poiSteps = SCRIPT.filter((s) => s.agent === "poi");
      const storySteps = SCRIPT.filter((s) => s.agent === "story");

      async function runAgent(
        steps: AgentStep[],
        setLogs: typeof setPoiLogs,
        setActive: typeof setPoiActive,
      ) {
        setActive(true);
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          if (cancelled) return;
          const lineId = ++id;
          const isFinal = i === steps.length - 1;
          setLogs((l) => [...l, { id: lineId, agent: step.agent, text: step.text, done: false, final: isFinal }]);
          await new Promise((r) => setTimeout(r, step.duration));
          if (cancelled) return;

          // 最后一个步骤保持 thinking 状态，直到整个流程结束
          if (!isFinal) {
            setLogs((l) => l.map((x) => (x.id === lineId ? { ...x, done: true } : x)));
          }
        }

        // 所有步骤完成后，等待外部关闭 visible
        // 最后一个步骤会一直显示 thinking 状态
      }

      await Promise.all([
        runAgent(poiSteps, setPoiLogs, setPoiActive),
        runAgent(storySteps, setStoryLogs, setStoryActive),
      ]);
    }

    run();
    return () => { cancelled = true; };
  }, [visible]);

  // 漂浮的思考微粒
  const motes = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1.5 + Math.random() * 2.5,
        delay: Math.random() * 6,
        duration: 8 + Math.random() * 6,
        hue: Math.random() > 0.5 ? POI_COLOR : STORY_COLOR,
      })),
    [],
  );

  if (!visible) return null;

  const bothDone = !poiActive && !storyActive && poiLogs.length > 0 && storyLogs.length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 fade-in overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 30% 20%, color-mix(in oklab, " + POI_COLOR + " 8%, transparent), transparent 55%)," +
          "radial-gradient(circle at 70% 80%, color-mix(in oklab, " + STORY_COLOR + " 8%, transparent), transparent 55%)," +
          "color-mix(in oklab, var(--bg) 86%, transparent)",
        backdropFilter: "blur(18px) saturate(1.05)",
        WebkitBackdropFilter: "blur(18px) saturate(1.05)",
      }}
    >
      {/* 漂浮微粒 */}
      <div className="pointer-events-none absolute inset-0">
        {motes.map((m) => (
          <span
            key={m.i}
            className="agent-mote"
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: m.size,
              height: m.size,
              background: m.hue,
              animationDelay: `${m.delay}s`,
              animationDuration: `${m.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-xl relative max-h-full overflow-y-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="display italic text-[10px] tracking-[0.45em] text-[var(--ink-soft)] mb-2.5">
            DUAL · AGENT · SYSTEM
          </div>
          <h2 className="cn-serif text-[20px] text-[var(--ink)] leading-snug">
            两位 Agent 正在为你<span className="italic">思考</span>
          </h2>
          <ThinkingCaption bothDone={bothDone} />
        </div>

        {/* 中央呼吸光环 + 连接线 */}
        <div className="relative">
          <div
            className="pointer-events-none absolute top-[42px] left-1/2 -translate-x-1/2 w-px h-[calc(100%-84px)] opacity-50 hidden sm:block"
            style={{
              background:
                `linear-gradient(180deg, transparent, color-mix(in oklab, ${POI_COLOR} 40%, transparent) 30%, color-mix(in oklab, ${STORY_COLOR} 40%, transparent) 70%, transparent)`,
            }}
          />
          <div
            className="pointer-events-none absolute top-[42px] left-1/2 -translate-x-1/2 w-10 h-10 rounded-full hidden sm:flex items-center justify-center"
          >
            <span className="absolute inset-0 rounded-full agent-breath" style={{ background: `radial-gradient(circle, color-mix(in oklab, var(--ink) 12%, transparent), transparent 70%)` }} />
            <span className="display italic text-[10px] text-[var(--ink-soft)] relative">⟁</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
            <AgentPanel
              title="POI 规划师"
              subtitle="Path Planner"
              emoji="🗺"
              color={POI_COLOR}
              active={poiActive}
              logs={poiLogs}
              align="left"
            />
            <AgentPanel
              title="故事生成师"
              subtitle="Narrative Weaver"
              emoji="✦"
              color={STORY_COLOR}
              active={storyActive}
              logs={storyLogs}
              align="right"
            />
          </div>
        </div>

        <div className="text-center mt-6">
          <div className="cn-serif text-[11px] text-[var(--ink-soft)] italic opacity-70">
            * 由多 Agent 协同生成，并非通用搜索结果
          </div>
        </div>
      </div>

      <style>{`
        @keyframes agent-mote-drift {
          0%   { transform: translate3d(0, 0, 0) scale(1);   opacity: 0; }
          15%  { opacity: 0.55; }
          50%  { transform: translate3d(12px, -22px, 0) scale(1.15); opacity: 0.7; }
          85%  { opacity: 0.4; }
          100% { transform: translate3d(-8px, -44px, 0) scale(0.9); opacity: 0; }
        }
        .agent-mote {
          position: absolute;
          border-radius: 9999px;
          filter: blur(0.4px);
          animation: agent-mote-drift linear infinite;
          opacity: 0;
        }
        @keyframes agent-breath {
          0%, 100% { transform: scale(0.85); opacity: 0.5; }
          50%      { transform: scale(1.25); opacity: 0.95; }
        }
        .agent-breath { animation: agent-breath 3.4s ease-in-out infinite; }

        @keyframes agent-typing {
          0%   { opacity: 0; transform: translateY(2px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .agent-line-in { animation: agent-typing 0.45s ease-out both; }

        @keyframes agent-caret {
          0%, 49%   { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .agent-caret { animation: agent-caret 0.9s steps(1) infinite; }

        @keyframes agent-shimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .agent-shimmer {
          background: linear-gradient(90deg,
            color-mix(in oklab, var(--ink) 50%, transparent),
            var(--ink),
            color-mix(in oklab, var(--ink) 50%, transparent)
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: agent-shimmer 2.2s linear infinite;
        }

        @keyframes agent-ring {
          0%   { transform: scale(0.7); opacity: 0.8; }
          80%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .agent-ring {
          position: absolute; inset: -6px; border-radius: 9999px;
          border: 1px solid currentColor;
          animation: agent-ring 2.2s ease-out infinite;
        }
      `}</style>
    </div>
  );
}

function ThinkingCaption({ bothDone }: { bothDone: boolean }) {
  const phrases = useMemo(
    () => ["正在思考", "正在编织你的今日剧本", "正在为你寻找最贴近的小店", "正在揉合地点与情绪"],
    [],
  );
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (bothDone) return;
    const t = setInterval(() => setIdx((n) => (n + 1) % phrases.length), 2400);
    return () => clearInterval(t);
  }, [bothDone, phrases.length]);

  return (
    <div className="cn-serif text-[12.5px] text-[var(--ink-soft)] mt-2 h-5 transition-opacity">
      {bothDone ? (
        <span className="italic">✦ 已为你拟好</span>
      ) : (
        <span key={idx} className="agent-line-in inline-block">
          <span className="agent-shimmer">{phrases[idx]}</span>
          <span className="agent-caret ml-0.5">·</span>
        </span>
      )}
    </div>
  );
}

function AgentPanel({
  title, subtitle, emoji, color, active, logs, align,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  active: boolean;
  logs: LogLine[];
  align: "left" | "right";
}) {
  return (
    <div
      className="relative rounded-2xl p-4 sm:p-5 border bg-[var(--card)] overflow-hidden"
      style={{
        borderColor: active ? `color-mix(in oklab, ${color} 35%, var(--border))` : "var(--border)",
        minHeight: 280,
        boxShadow: active
          ? `0 1px 0 rgba(0,0,0,0.02), 0 14px 38px -18px color-mix(in oklab, ${color} 35%, transparent), inset 0 0 0 1px color-mix(in oklab, ${color} 8%, transparent)`
          : "0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -18px rgba(0,0,0,0.08)",
        transition: "box-shadow 0.5s, border-color 0.5s",
      }}
    >
      {/* 角落柔光 */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-60"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${color} 18%, transparent), transparent 70%)`,
        }}
      />

      <div
        className="relative flex items-center gap-3 mb-3 pb-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-[15px] shrink-0"
          style={{
            background: `color-mix(in oklab, ${color} 16%, var(--muted))`,
            color,
          }}
        >
          {active && <span className="agent-ring" style={{ color }} />}
          <span className={active ? "agent-breath inline-block" : "inline-block"}>{emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="cn-serif text-[13.5px] text-[var(--ink)] leading-tight">{title}</div>
          <div className="display italic text-[9.5px] tracking-[0.22em] text-[var(--ink-soft)] mt-0.5">
            {subtitle}
          </div>
        </div>
        <Status active={active} hasLogs={logs.length > 0} color={color} />
      </div>

      <div className="space-y-2 relative">
        {logs.length === 0 && (
          <div className="cn-serif text-[12px] text-[var(--ink-soft)] italic flex items-center gap-1.5">
            <span className="agent-shimmer">等待启动</span>
            <span className="agent-caret">·</span>
          </div>
        )}
        {logs.map((line, idx) => {
          const isCurrent = !line.done;
          const isLast = idx === logs.length - 1;
          return (
            <div
              key={line.id}
              className="agent-line-in flex items-start gap-2.5 cn-serif text-[12.5px] leading-relaxed"
            >
              <StepDot done={line.done} color={color} align={align} />
              <span
                className={`flex-1 ${line.done ? "text-[var(--ink-soft)]" : "text-[var(--ink)]"}`}
                style={{ opacity: line.done ? 0.78 : 1 }}
              >
                {isCurrent ? (
                  <>
                    <span className="agent-shimmer">{line.text}</span>
                    {isLast && <span className="agent-caret ml-1">·</span>}
                  </>
                ) : (
                  <>
                    {line.final ? <span className="italic" style={{ color }}>✦ </span> : null}
                    {line.text}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Status({ active, hasLogs, color }: { active: boolean; hasLogs: boolean; color: string }) {
  if (active) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: color }}>
          <span className="absolute inset-0 rounded-full agent-breath" style={{ background: color }} />
        </span>
        <span className="display italic text-[9px] tracking-[0.2em]" style={{ color }}>
          THINKING
        </span>
      </div>
    );
  }
  if (hasLogs) {
    return (
      <div className="display italic text-[9px] tracking-[0.2em] text-[var(--ink-soft)]">
        ✓ DONE
      </div>
    );
  }
  return null;
}

function StepDot({ done, color, align }: { done: boolean; color: string; align: "left" | "right" }) {
  if (done) {
    return (
      <span
        className="shrink-0 mt-[5px] inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px]"
        style={{
          background: `color-mix(in oklab, ${color} 14%, transparent)`,
          color,
        }}
      >
        ✓
      </span>
    );
  }
  return (
    <span className="shrink-0 mt-[7px] relative w-3.5 h-3.5 inline-flex items-center justify-center">
      <span
        className="absolute w-2 h-2 rounded-full"
        style={{ background: color, opacity: 0.85 }}
      />
      <span
        className="absolute w-3.5 h-3.5 rounded-full agent-breath"
        style={{ border: `1px solid ${color}`, opacity: 0.5 }}
      />
      {/* align hint avoids unused-var warning */}
      <span className="sr-only">{align}</span>
    </span>
  );
}
