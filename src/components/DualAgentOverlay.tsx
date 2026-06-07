import { useEffect, useState } from "react";

/**
 * 双 Agent 可视化遮罩
 * 展示「POI 规划师」+「故事生成师」并行工作，把幕后 Agent 协作显性化
 */

type AgentStep = {
  agent: "poi" | "story";
  text: string;
  duration: number; // ms
};

const SCRIPT: AgentStep[] = [
  { agent: "poi", text: "读取你的人设关键词…", duration: 1200 },
  { agent: "story", text: "感受今日情绪基调…", duration: 1200 },
  { agent: "poi", text: "在 3 公里内扫描候选 POI", duration: 1600 },
  { agent: "story", text: "构思故事开场白…", duration: 1500 },
  { agent: "poi", text: "筛选符合人设气质的小店", duration: 1500 },
  { agent: "story", text: "设计情绪起承转合曲线", duration: 1400 },
  { agent: "poi", text: "按动线优化访问顺序", duration: 1400 },
  { agent: "story", text: "为每一站编织叙事钩子", duration: 1500 },
  { agent: "poi", text: "标注预约 / 限时点位", duration: 1100 },
  { agent: "story", text: "打磨结语与情绪落点", duration: 1300 },
  { agent: "poi", text: "✓ 路线已就绪", duration: 800 },
  { agent: "story", text: "✓ 剧本已编织完成", duration: 800 },
];

type LogLine = { id: number; agent: "poi" | "story"; text: string; done: boolean };

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
      // 同时启动两条线
      const poiSteps = SCRIPT.filter((s) => s.agent === "poi");
      const storySteps = SCRIPT.filter((s) => s.agent === "story");

      async function runAgent(
        steps: AgentStep[],
        setLogs: typeof setPoiLogs,
        setActive: typeof setPoiActive,
      ) {
        setActive(true);
        for (const step of steps) {
          if (cancelled) return;
          const lineId = ++id;
          setLogs((l) => [...l, { id: lineId, agent: step.agent, text: step.text, done: false }]);
          await new Promise((r) => setTimeout(r, step.duration));
          if (cancelled) return;
          setLogs((l) => l.map((x) => (x.id === lineId ? { ...x, done: true } : x)));
        }
        setActive(false);
      }

      await Promise.all([
        runAgent(poiSteps, setPoiLogs, setPoiActive),
        runAgent(storySteps, setStoryLogs, setStoryActive),
      ]);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 fade-in"
      style={{
        background: "color-mix(in oklab, var(--bg) 88%, transparent)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div className="w-full max-w-xl">
        <div className="text-center mb-5">
          <div className="display italic text-[10px] tracking-[0.4em] text-[var(--ink-soft)] mb-2">
            DUAL · AGENT · SYSTEM
          </div>
          <h2 className="cn-serif text-[19px] text-[var(--ink)] leading-snug">
            两位 Agent 正在为你协作
          </h2>
          <div className="cn-serif text-[12px] text-[var(--ink-soft)] mt-1.5">
            POI 规划师寻找地点 · 故事生成师编织叙事
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AgentPanel
            title="POI 规划师"
            subtitle="Path Planner"
            emoji="🗺️"
            color="oklch(0.62 0.13 18)"
            active={poiActive}
            logs={poiLogs}
          />
          <AgentPanel
            title="故事生成师"
            subtitle="Narrative Weaver"
            emoji="✦"
            color="oklch(0.62 0.12 70)"
            active={storyActive}
            logs={storyLogs}
          />
        </div>

        <div className="text-center mt-5">
          <div className="cn-serif text-[11px] text-[var(--ink-soft)] italic opacity-70">
            * 由多 Agent 协同生成，并非通用搜索结果
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentPanel({
  title, subtitle, emoji, color, active, logs,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  active: boolean;
  logs: LogLine[];
}) {
  return (
    <div
      className="rounded-2xl p-4 border bg-[var(--card)]"
      style={{
        borderColor: "var(--border)",
        minHeight: 260,
        boxShadow: "0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -16px rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-3 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] shrink-0"
          style={{
            background: `color-mix(in oklab, ${color} 18%, var(--muted))`,
            boxShadow: active ? `0 0 0 4px color-mix(in oklab, ${color} 15%, transparent)` : "none",
            transition: "box-shadow 0.3s",
          }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="cn-serif text-[13px] text-[var(--ink)]">{title}</div>
          <div className="display italic text-[9.5px] tracking-[0.2em] text-[var(--ink-soft)]">
            {subtitle}
          </div>
        </div>
        {active && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
            <span className="display italic text-[9px] tracking-[0.15em]" style={{ color }}>
              RUNNING
            </span>
          </div>
        )}
        {!active && logs.length > 0 && (
          <div className="display italic text-[9px] tracking-[0.15em] text-[var(--ink-soft)]">
            ✓ DONE
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {logs.map((line) => (
          <div
            key={line.id}
            className="flex items-start gap-2 cn-serif text-[12px] fade-up"
            style={{ color: line.done ? "var(--ink-soft)" : "var(--ink)" }}
          >
            <span className="shrink-0 mt-0.5" style={{ color: line.done ? "var(--ink-soft)" : color }}>
              {line.done ? "✓" : "›"}
            </span>
            <span className="flex-1 leading-snug">
              {line.text}
              {!line.done && (
                <span className="inline-flex ml-1 items-center gap-0.5">
                  <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: color, animationDelay: "0s" }} />
                  <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: color, animationDelay: "0.2s" }} />
                  <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: color, animationDelay: "0.4s" }} />
                </span>
              )}
            </span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="cn-serif text-[12px] text-[var(--ink-soft)] italic">等待启动…</div>
        )}
      </div>
    </div>
  );
}
