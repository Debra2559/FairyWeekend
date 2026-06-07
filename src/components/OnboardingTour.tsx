import { useEffect, useState } from "react";

const STORAGE_KEY = "tp_onboarded_v1";

const STEPS = [
  {
    badge: "STEP 01",
    title: "抽一张今日人设",
    desc: "AI 对话陪你聊几句心情，或自己挑、塔罗随机——拿到属于今天的身份卡。",
    art: "🎴",
  },
  {
    badge: "STEP 02",
    title: "AI 为你写一条路线",
    desc: "结合你所在的城市、时段和情绪，生成 3–4 个有故事的真实地点。",
    art: "🗺️",
  },
  {
    badge: "STEP 03",
    title: "走进手绘叙事地图",
    desc: "点亮场景、读人设视角的小段叙事、完成轻量任务，像在过另一种生活。",
    art: "✦",
  },
  {
    badge: "STEP 04",
    title: "美团一键直达",
    desc: "每个地点内嵌美团跳转，吃喝玩订都在一步之内——结束后自动生成你的连载。",
    art: "🥡",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // 轻微延迟，让首屏先呈现
        const t = setTimeout(() => setOpen(true), 350);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function close() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-5"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm onb-fade"
        onClick={close}
      />
      <div className="relative w-full max-w-md rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)] overflow-hidden onb-pop">
        {/* skip */}
        <button
          onClick={close}
          className="absolute top-3 right-3 z-10 display text-[10px] tracking-[0.25em] text-[var(--ink-soft)] hover:text-[var(--ink)] px-2 py-1"
        >
          跳过
        </button>

        {/* art */}
        <div
          className="h-44 flex items-center justify-center text-6xl relative"
          style={{
            background:
              "linear-gradient(160deg, color-mix(in oklab, var(--accent) 18%, var(--card)) 0%, var(--card) 100%)",
          }}
        >
          <span aria-hidden className="onb-art">{s.art}</span>
        </div>

        {/* content */}
        <div className="px-6 pt-5 pb-6 text-center">
          <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
            {s.badge}
          </div>
          <h3 className="cn-serif text-[20px] text-[var(--ink)] mt-2">
            {s.title}
          </h3>
          <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink-soft)] mt-2">
            {s.desc}
          </p>

          {/* dots */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-[var(--ink)]"
                    : "w-1.5 bg-[var(--border)]"
                }`}
              />
            ))}
          </div>

          {/* actions */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={() => setStep((n) => Math.max(0, n - 1))}
              disabled={step === 0}
              className="cn-serif text-[13px] text-[var(--ink-soft)] disabled:opacity-30 px-3 py-2"
            >
              ← 上一步
            </button>
            <button
              onClick={() => (isLast ? close() : setStep((n) => n + 1))}
              className="btn-soft"
            >
              {isLast ? "开始抽卡 →" : "下一步"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .onb-fade { animation: onbFade .25s ease-out both; }
        .onb-pop { animation: onbPop .35s cubic-bezier(.22,1,.36,1) both; }
        .onb-art { animation: onbArt 2.4s ease-in-out infinite; display:inline-block; }
        @keyframes onbFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes onbPop {
          from { opacity: 0; transform: translateY(12px) scale(.96) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes onbArt {
          0%,100% { transform: translateY(0) rotate(-2deg) }
          50%     { transform: translateY(-6px) rotate(2deg) }
        }
      `}</style>
    </div>
  );
}
