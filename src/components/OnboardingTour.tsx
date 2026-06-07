import { useEffect, useRef, useState } from "react";
import imgCards from "@/assets/onb-1-cards.jpg.asset.json";
import imgRoute from "@/assets/onb-2-route.jpg.asset.json";
import imgWalk from "@/assets/onb-3-walk.jpg.asset.json";
import imgMeituan from "@/assets/onb-4-meituan.jpg.asset.json";

const STORAGE_KEY = "tp_onboarded_v3";

const STEPS = [
  {
    badge: "WHY",
    title: "周末刷半天美团，还是不知道去哪？",
    desc: "只需要写下你的想法，或者选择你这周最想成为的人设——剩下的交给今天。",
    img: imgCards.url,
  },
  {
    badge: "STEP 01",
    title: "AI 为你写一条路线",
    desc: "结合你所在的城市、时段和情绪，生成 1–4 个真实地点，串成一段属于今天的小故事。",
    img: imgRoute.url,
  },
  {
    badge: "STEP 02",
    title: "走进手绘叙事地图",
    desc: "点亮场景、读人设视角的小段叙事、完成轻量任务——像在过另一种生活。",
    img: imgWalk.url,
  },
  {
    badge: "STEP 03",
    title: "想法说出来，美团帮你跑",
    desc: "只需要输入你的想法，导航、团购、订位、外卖——美团一键直达，不用愁。",
    img: imgMeituan.url,
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const wheelLock = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "done") {
        // 已完成，不再显示
        return;
      }
      const savedStep = raw ? parseInt(raw, 10) : NaN;
      if (!Number.isNaN(savedStep) && savedStep >= 0 && savedStep < STEPS.length) {
        // 有保存的进度，从该步骤继续
        setStep(savedStep);
      }
      const t = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t);
    } catch {
      /* ignore */
    }
  }, []);

  function close() {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  function saveStep(next: number) {
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }

  function go(delta: number) {
    setStep((n) => {
      const next = Math.max(0, Math.min(STEPS.length - 1, n + delta));
      stepRef.current = next;
      saveStep(next);
      return next;
    });
  }

  // 键盘 ← →
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 原生 wheel/touch 监听（passive:false 才能 preventDefault；React onWheel 默认 passive）
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const now = Date.now();
      const dx = e.deltaX;
      const dy = e.deltaY;
      const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(d) < 8) return;
      e.preventDefault();
      if (now - wheelLock.current < 400) return;
      wheelLock.current = now;
      go(d > 0 ? 1 : -1);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current == null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = (e.changedTouches[0].clientY - (touchStartY.current ?? 0));
      touchStartX.current = null;
      touchStartY.current = null;
      if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)] overflow-hidden onb-pop select-none touch-pan-y"
      >
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
          <h3 key={`t-${step}`} className="cn-serif text-[20px] text-[var(--ink)] mt-2 onb-textIn">
            {s.title}
          </h3>
          <p key={`d-${step}`} className="cn-serif text-[13px] leading-relaxed text-[var(--ink-soft)] mt-2 min-h-[3.6em] onb-textIn">
            {s.desc}
          </p>

          {/* dots */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setStep(i);
                  saveStep(i);
                }}
                aria-label={`第 ${i + 1} 步`}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-[var(--ink)]"
                    : "w-1.5 bg-[var(--border)] hover:bg-[var(--ink-soft)]"
                }`}
              />
            ))}
          </div>

          {/* hint */}
          <div className="mt-2 display text-[9px] tracking-[0.25em] text-[var(--ink-soft)] opacity-60">
            滑动 / ← → 切换
          </div>

          {/* actions */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              onClick={() => go(-1)}
              disabled={step === 0}
              className="cn-serif text-[13px] text-[var(--ink-soft)] disabled:opacity-30 px-3 py-2"
            >
              ← 上一步
            </button>
            <button
              onClick={() => (isLast ? close() : go(1))}
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
        .onb-textIn { animation: onbTextIn .35s ease-out both; }
        @keyframes onbFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes onbPop {
          from { opacity: 0; transform: translateY(12px) scale(.96) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes onbImgIn {
          from { opacity: 0; transform: scale(1.04) }
          to   { opacity: 1; transform: scale(1) }
        }
        @keyframes onbTextIn {
          from { opacity: 0; transform: translateY(4px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  );
}
