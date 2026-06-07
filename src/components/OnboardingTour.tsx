import { useEffect, useState } from "react";
import imgCards from "@/assets/onb-1-cards.jpg.asset.json";
import imgRoute from "@/assets/onb-2-route.jpg.asset.json";
import imgWalk from "@/assets/onb-3-walk.jpg.asset.json";
import imgMeituan from "@/assets/onb-4-meituan.jpg.asset.json";

const STORAGE_KEY = "tp_onboarded_v2";

const STEPS = [
  {
    badge: "WHY",
    title: "周末不知道去哪？",
    desc: "刷半天美团也挑不出来——那就不如换个玩法：今天，让一张人设卡替你决定。",
    img: imgCards.url,
  },
  {
    badge: "STEP 01",
    title: "抽一张今日人设",
    desc: "AI 对话陪你聊几句心情，或自己挑、塔罗随机——拿到属于今天的身份卡。",
    img: imgCards.url,
  },
  {
    badge: "STEP 02",
    title: "AI 为你写一条路线",
    desc: "结合你所在的城市、时段和情绪，生成 3–4 个真实可走的地点和一段小故事。",
    img: imgRoute.url,
  },
  {
    badge: "STEP 03",
    title: "走进手绘叙事地图",
    desc: "点亮场景、读人设视角的小段叙事、完成轻量任务，像在过另一种生活。",
    img: imgWalk.url,
  },
  {
    badge: "STEP 04",
    title: "美团一键直达",
    desc: "每个地点都内嵌美团搜索：吃、喝、玩、订、外卖——从规划到下单，一步不绕。",
    img: imgMeituan.url,
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
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
        className="absolute inset-0 bg-black/45 backdrop-blur-sm onb-fade"
        onClick={close}
      />
      <div className="relative w-full max-w-md rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)] overflow-hidden onb-pop">
        <button
          onClick={close}
          className="absolute top-3 right-3 z-10 display text-[10px] tracking-[0.25em] text-[var(--ink-soft)] hover:text-[var(--ink)] bg-[var(--card)]/80 backdrop-blur rounded-full px-3 py-1"
        >
          跳过
        </button>

        {/* image */}
        <div className="relative h-48 sm:h-56 overflow-hidden bg-[var(--muted)]">
          <img
            key={s.img}
            src={s.img}
            alt={s.title}
            width={768}
            height={512}
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover onb-img"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--card)] to-transparent" />
        </div>

        {/* content */}
        <div className="px-6 pt-2 pb-6 text-center">
          <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
            {s.badge}
          </div>
          <h3 className="cn-serif text-[20px] text-[var(--ink)] mt-2">
            {s.title}
          </h3>
          <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink-soft)] mt-2 min-h-[3.6em]">
            {s.desc}
          </p>

          {/* dots */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`第 ${i + 1} 步`}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-[var(--ink)]"
                    : "w-1.5 bg-[var(--border)] hover:bg-[var(--ink-soft)]"
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
        .onb-pop  { animation: onbPop .35s cubic-bezier(.22,1,.36,1) both; }
        .onb-img  { animation: onbImgIn .5s ease-out both; }
        @keyframes onbFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes onbPop {
          from { opacity: 0; transform: translateY(12px) scale(.96) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes onbImgIn {
          from { opacity: 0; transform: scale(1.04) }
          to   { opacity: 1; transform: scale(1) }
        }
      `}</style>
    </div>
  );
}
