import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadRun, clearRun, archiveCurrentRun, loadSagas } from "@/lib/persona-store";
import type { JourneyRunState } from "@/lib/persona-types";
import { RARITY_LABEL } from "@/lib/cards";
import { PhotoOnboardingModal } from "@/components/PhotoOnboardingModal";
import { getUserPhoto } from "@/lib/user-photo";
import { exportSeriesStorybook } from "@/lib/series-export";
import { toast } from "sonner";

export const Route = createFileRoute("/finale")({ component: FinalePage });

function FinalePage() {
  const navigate = useNavigate();
  const [run, setRun] = useState<JourneyRunState | null>(null);
  const [shown, setShown] = useState("");
  const [rewardOpen, setRewardOpen] = useState(false);
  const [bookExporting, setBookExporting] = useState(false);

  useEffect(() => {
    const r = loadRun();
    if (!r) { navigate({ to: "/" }); return; }
    setRun(r);
    archiveCurrentRun(); // 永久收录这段旅程到个人中心
    const text = r.journey.closing;
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, 50);
    // 完成奖励：还没上传过照片的话，2 秒后弹出解锁专属形象的奖励
    let rewardTimer: ReturnType<typeof setTimeout> | undefined;
    if (!getUserPhoto()) {
      rewardTimer = setTimeout(() => setRewardOpen(true), 2000);
    }
    return () => {
      clearInterval(t);
      if (rewardTimer) clearTimeout(rewardTimer);
    };
  }, [navigate]);

  const petals = useMemo(
    () => Array.from({ length: 18 }).map((_, i) => ({
      i,
      left: Math.random() * 100,
      dx: (Math.random() - 0.5) * 250,
      delay: Math.random() * 6,
      duration: 7 + Math.random() * 4,
      size: 10 + Math.random() * 10,
    })),
    [],
  );

  if (!run) return null;
  const { card, journey } = run;

  return (
    <div className="relative min-h-screen px-5 pt-12 pb-16 max-w-xl mx-auto overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {petals.map((p) => (
          <span
            key={p.i}
            className="petal"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              ['--dx' as string]: `${p.dx}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="relative z-10 text-center fade-up">
        <div className="display text-[10px] tracking-[0.4em] text-[var(--ink-soft)] mb-3">
          CLOSING · 今日结语
        </div>
        <h1 className="display text-3xl text-[var(--ink)] italic">
          A Day As {card.rarity}
        </h1>
        <div className="cn-serif text-[13px] text-[var(--ink-soft)] mt-2">
          {RARITY_LABEL[card.rarity]} · 「{card.identity}」
        </div>
      </div>

      {/* Closing card */}
      <div className="relative z-10 mt-10 persona-card p-7" data-rarity={card.rarity}>
        <p className="cn-serif text-[17px] leading-[1.95] text-[var(--ink)] cursor-blink">
          {shown}
        </p>

        <div className="mt-6 pt-6 border-t border-[var(--border)] flex items-baseline justify-between">
          <div className="display text-[11px] tracking-[0.3em] text-[var(--ink-soft)]">
            EMOTION ARC
          </div>
          <div className="cn-serif text-[13px] text-[var(--ink)] italic text-right">
            {journey.emotion_arc.start}
            <span className="mx-2 text-[var(--ink-soft)]">→</span>
            {journey.emotion_arc.end}
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div className="display text-[11px] tracking-[0.3em] text-[var(--ink-soft)]">
            SCENES
          </div>
          <div className="cn-serif text-[13px] text-[var(--ink)]">
            走过 {run.completedSceneOrders.length} / {journey.scenes.length}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 mt-10 flex flex-col items-center gap-3">
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `今日人设｜${card.identity}`,
                text: journey.closing,
              }).catch(() => {});
            } else {
              navigator.clipboard?.writeText(`今日人设｜${card.identity}\n\n${journey.closing}`);
            }
          }}
          className="btn-soft w-full justify-center"
        >
          ✶ 分享今日故事
        </button>
        <button
          onClick={() => navigate({ to: "/library" })}
          className="btn-soft w-full justify-center"
        >
          ❦ 收进我的连载库
        </button>

        <button
          onClick={() => {
            localStorage.setItem("todaypersona:open-postchain:v1", "1");
            navigate({ to: "/me" });
          }}
          className="btn-soft w-full justify-center"
        >
          生成今日出行总结
        </button>
        <button
          onClick={() => { clearRun(); navigate({ to: "/" }); }}
          className="btn-ghost"
        >
          抽下一张人设卡 →
        </button>
      </div>

      <PhotoOnboardingModal
        mode="reward"
        open={rewardOpen}
        onClose={() => setRewardOpen(false)}
      />
    </div>
  );
}
