import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { loadRun, recordScene, clearSceneRecord, reserveScene } from "@/lib/persona-store";
import type { JourneyRunState, JourneyScene, SceneRecord } from "@/lib/persona-types";
import { VenueIcon, detectVenue } from "@/components/VenueIcon";
import { getVenuePhotos } from "@/lib/venue-gallery";
import { buildBundle, isBundlePurchased, markBundlePurchased, type JourneyBundle } from "@/lib/bundle";
import { getSceneDeals, type SceneDeal } from "@/lib/scene-deals";
import { needsReservation, getReservationHint, getReservationLabel, buildMeituanReserveHref, buildDianpingReserveHref } from "@/lib/reservation";
import { toast } from "sonner";
import { JourneyChatPanel } from "@/components/JourneyChatPanel";
import { JourneyInviteFab } from "@/components/JourneyInviteFab";
import { groupPreset, type GroupMode } from "@/lib/group-mode";


export const Route = createFileRoute("/journey")({ component: JourneyPage });

function JourneyPage() {
  const navigate = useNavigate();
  const [run, setRun] = useState<JourneyRunState | null>(null);
  const [openScene, setOpenScene] = useState<JourneyScene | null>(null);
  const [openingShown, setOpeningShown] = useState("");
  const [bundleOpen, setBundleOpen] = useState(false);
  const [bundlePurchased, setBundlePurchased] = useState(false);

  useEffect(() => {
    const r = loadRun();
    if (!r) { navigate({ to: "/" }); return; }
    setRun(r);
    setBundlePurchased(isBundlePurchased(r.card.id));
    const text = r.journey.story_opening;
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setOpeningShown(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, 32);
    return () => clearInterval(t);
  }, [navigate]);

  function skipOpening() {
    if (run) setOpeningShown(run.journey.story_opening);
  }

  const bundle = useMemo(() => (run ? buildBundle(run) : null), [run]);

  if (!run || !bundle) return null;

  const { card, journey, city, completedSceneOrders } = run;
  const allDone = completedSceneOrders.length >= journey.scenes.length;

  function refresh() {
    const r = loadRun();
    if (r) setRun(r);
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "linear-gradient(180deg, #eef2e6 0%, #e3ebda 50%, #d9e4cf 100%)" }}>
      {/* Top bar */}
      <div className="max-w-xl mx-auto px-5 pt-6 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/card" })}
          className="display text-[11px] tracking-[0.3em] text-[var(--ink)] opacity-70"
        >
          ← 人设卡
        </button>
        <div className="rarity-chip" data-rarity={card.rarity}>✦ {card.rarity}</div>
      </div>

      {/* Title */}
      <div className="max-w-xl mx-auto px-5 mt-4">
        <h1 className="cn-serif text-[22px] text-[var(--ink)] leading-snug">{card.identity}</h1>
        <div className="cn-serif text-[13px] text-[var(--ink-soft)] mt-1 flex items-center gap-2 flex-wrap">
          <span>「{card.mission}」</span>
          {city && <span className="display italic text-[11px]">· {city}</span>}
          <span className="display italic text-[11px] px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--ink)]">
            {groupPreset((run.groupMode as GroupMode) ?? "solo").emoji} {groupPreset((run.groupMode as GroupMode) ?? "solo").label}
          </span>
        </div>
        <p
          onClick={skipOpening}
          className="cn-serif text-[14px] leading-[1.85] text-[var(--ink)] mt-3 cursor-blink select-none"
          title="点击跳过"
        >
          {openingShown}
        </p>
        <div className="display italic text-[11px] text-[var(--ink-soft)] mt-2">
          {journey.emotion_arc.start} → {journey.emotion_arc.end}
        </div>
      </div>

      {/* ✦ 全程套装 Bundle */}
      <div className="max-w-xl mx-auto px-5 mt-5">
        <BundleCard
          bundle={bundle}
          purchased={bundlePurchased}
          onOpen={() => setBundleOpen(true)}
        />
      </div>

      {/* ✦ 预订清单 */}
      <div className="max-w-xl mx-auto px-5 mt-4">
        <ReservationSummaryCard
          scenes={journey.scenes}
          sceneRecords={run.sceneRecords ?? {}}
          city={city}
          onPick={(s) => setOpenScene(s)}
        />
      </div>

      {/* Map */}
      <div className="max-w-xl mx-auto px-3 mt-6">
        <JourneyMap
          scenes={journey.scenes}
          completed={completedSceneOrders}
          onPick={(s) => setOpenScene(s)}
          cardId={card.id}
          city={city}
        />
      </div>

      {/* Legend / progress */}
      <div className="max-w-xl mx-auto px-5 mt-5 text-center">
        <div className="display italic text-[10.5px] tracking-[0.25em] text-[var(--ink-soft)]">
          TODAY · PROGRESS
        </div>
        <div className="flex items-center justify-center gap-2 mt-2.5">
          {journey.scenes.map((s) => {
            const done = completedSceneOrders.includes(s.order);
            return (
              <div key={s.order} className="flex items-center gap-2">
                <button
                  onClick={() => setOpenScene(s)}
                  className={`w-7 h-7 rounded-full cn-serif text-[11px] flex items-center justify-center transition ${
                    done
                      ? "bg-[var(--ink)] text-[var(--card)] shadow-[0_4px_12px_-4px_rgba(60,40,30,0.5)]"
                      : "bg-[var(--card)] border border-dashed border-[var(--ink-soft)]/50 text-[var(--ink-soft)]"
                  }`}
                  aria-label={`场景 ${s.order}`}
                >
                  {done ? "✓" : s.order}
                </button>
              </div>
            );
          })}
        </div>
        <div className="cn-serif text-[12px] text-[var(--ink-soft)] mt-3">
          {allDone
            ? "今天的剧本走完了 ✶"
            : `点亮全部 ${journey.scenes.length} 处，今日结语就会浮现`}
        </div>
        <button
          onClick={() => navigate({ to: "/finale" })}
          disabled={!allDone}
          className="btn-soft mt-4"
        >
          {allDone
            ? "解锁今日结语 ✶"
            : `还差 ${journey.scenes.length - completedSceneOrders.length} 处 · 继续打卡`}
        </button>
      </div>

      {/* Scene modal */}
      {openScene && (
        <SceneSheet
          scene={openScene}
          done={completedSceneOrders.includes(openScene.order)}
          record={run.sceneRecords?.[openScene.order]}
          city={city}
          onClose={() => setOpenScene(null)}
          onUpdated={refresh}
          bundlePurchased={bundlePurchased}
        />
      )}

      {/* Bundle purchase sheet */}
      {bundleOpen && (
        <BundleSheet
          bundle={bundle}
          scenes={journey.scenes}
          city={city}
          purchased={bundlePurchased}
          onClose={() => setBundleOpen(false)}
          onPurchased={() => {
            markBundlePurchased(card.id);
            setBundlePurchased(true);
            toast.success("已锁定今日全程套装 · 到店出示二维码核销");
          }}
        />
      )}

      <JourneyChatPanel
        card={card}
        city={city}
        journey={journey}
        onUpdated={() => {
          refresh();
          setOpenScene(null);
        }}
      />

      <JourneyInviteFab run={run} />
    </div>
  );
}

/* ============ Bundle Card & Sheet ============ */

function BundleCard({
  bundle, purchased, onOpen,
}: { bundle: JourneyBundle; purchased: boolean; onOpen: () => void }) {
  const save = bundle.originalPrice - bundle.dealPrice;
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl overflow-hidden relative fade-up bg-[var(--card)] border border-[var(--border)] hover:border-[var(--ink-soft)] transition"
      style={{
        boxShadow: "0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -16px rgba(60,40,30,0.18)",
        padding: "18px 20px",
      }}
    >
      {/* 顶部细金线，呼应编辑/出版气质 */}
      <div
        className="absolute top-0 left-5 right-5 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--ink-soft), transparent)", opacity: 0.45 }}
      />
      <div className="flex items-center justify-between">
        <div className="display italic text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
          {purchased ? "✓ PASS ACTIVATED" : "✦ TODAY ONLY · ONE-DAY PASS"}
        </div>
        <div className="display italic text-[10px] text-[var(--ink-soft)]/70">#{bundle.dealId}</div>
      </div>

      <h3 className="cn-serif text-[18px] text-[var(--ink)] mt-2 leading-snug">{bundle.title}</h3>
      <div className="cn-serif text-[12.5px] italic text-[var(--ink-soft)] mt-0.5">{bundle.subtitle}</div>

      {/* 通行证元信息 · 像车票上的小字 */}
      <div className="mt-2.5 flex items-center gap-2 cn-serif text-[11px] text-[var(--ink-soft)]">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-[var(--border)]">
          🎟 一日通行证
        </span>
        <span>今日有效</span>
        <span className="opacity-50">·</span>
        <span>{bundle.highlights.length} 站全程</span>
        <span className="opacity-50">·</span>
        <span>一码核销</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {bundle.highlights.map((h, i) => (
          <span
            key={i}
            className="cn-serif text-[11px] px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--ink)]"
          >
            {i + 1}. {h}
          </span>
        ))}
      </div>

      {/* 分隔虚线 —— 像票根的撕口 */}
      <div className="mt-4 relative border-t border-dashed border-[var(--border)]">
        <span className="absolute -left-3 -top-1.5 w-3 h-3 rounded-full bg-[var(--background)] border-r border-[var(--border)]" />
        <span className="absolute -right-3 -top-1.5 w-3 h-3 rounded-full bg-[var(--background)] border-l border-[var(--border)]" />
      </div>

      <div className="flex items-end justify-between mt-3">
        <div>
          {!purchased && (
            <div className="display italic text-[11px] text-[var(--ink-soft)] line-through">
              ¥{bundle.originalPrice}
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="cn-serif text-[26px] text-[var(--ink)] leading-none">
              ¥{bundle.dealPrice}
            </span>
            {!purchased && (
              <span className="display italic text-[10px] tracking-[0.15em] text-[oklch(0.55_0.13_50)]">
                省 ¥{save} · 单买更贵
              </span>
            )}
          </div>
        </div>
        <div className="cn-serif text-[12px] px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--card)]">
          {purchased ? "查看通行证 →" : "领取通行证 →"}
        </div>
      </div>

    </button>
  );
}

function BundleSheet({
  bundle, scenes, city, purchased, onClose, onPurchased,
}: {
  bundle: JourneyBundle;
  scenes: JourneyScene[];
  city?: string;
  purchased: boolean;
  onClose: () => void;
  onPurchased: () => void;
}) {
  const saved = Math.max(0, bundle.originalPrice - bundle.dealPrice);
  const discount = bundle.originalPrice > 0
    ? (bundle.dealPrice / bundle.originalPrice * 10).toFixed(1)
    : "9.9";
  // 演示数据 — 给套装一些可信的"团购感"
  const stats = useMemo(() => {
    const seed = bundle.dealId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const sold = 800 + (seed % 1800);
    const rating = (4.6 + ((seed % 4) / 10)).toFixed(1);
    const reviews = 120 + (seed % 360);
    return { sold, rating, reviews };
  }, [bundle.dealId]);

  // 场景缩略图：用 VenueIcon 检测到的 kind 拿到 unsplash 图
  const sceneThumbs = useMemo(
    () => scenes.map((s) => {
      const kind = detectVenue(s.location_type, s.location_name);
      const photos = getVenuePhotos(kind);
      return photos[s.order % photos.length] || photos[0];
    }),
    [scenes],
  );

  // 套装顶部封面：用第一个场景的图
  const heroImage = sceneThumbs[0];

  // 福利图标
  const perkIcons = ["🎟", "🎁", "✨", "🍃", "📍", "♻︎"];

  // 推荐加购（演示）
  const addOns = useMemo(() => {
    const seed = bundle.dealId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return [
      { title: "纪念明信片 × 3", price: 9, original: 18, sold: 420 + (seed % 200), img: sceneThumbs[1] || heroImage },
      { title: "城市气味小样盒", price: 29, original: 49, sold: 180 + (seed % 120), img: sceneThumbs[2] || heroImage },
    ];
  }, [bundle.dealId, sceneThumbs, heroImage]);

  // 滚动时让 hero 收起为顶部紧凑条
  const scrollRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setCompact(el.scrollTop > 160);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center fade-in" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(40,35,30,0.55)", backdropFilter: "blur(6px)" }} />
      <div
        className="relative w-full max-w-xl rounded-t-[32px] overflow-hidden bg-[var(--card)] fade-up flex flex-col"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 紧凑 sticky header（滚动后显形） */}
        <div
          className="absolute top-0 inset-x-0 z-30 flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur transition-all duration-200"
          style={{
            opacity: compact ? 1 : 0,
            transform: compact ? "translateY(0)" : "translateY(-100%)",
            pointerEvents: compact ? "auto" : "none",
          }}
        >
          <img src={heroImage} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="cn-serif text-[13px] text-[var(--ink)] truncate">{bundle.title}</div>
            <div className="cn-serif text-[11px] text-[#c44a2a]">¥{bundle.dealPrice}
              {!purchased && saved > 0 && (
                <span className="display italic text-[10px] text-[var(--ink-soft)] line-through ml-1.5">¥{bundle.originalPrice}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--muted)] shrink-0"
          >✕</button>
        </div>

        {/* ============ Scroll body（hero 一起滚） ============ */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {/* Hero cover */}
          <div className="relative" style={{ height: 240 }}>
            <img
              src={heroImage}
              alt={bundle.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div
              className="absolute inset-0"
              style={{
                background: purchased
                  ? "linear-gradient(180deg, rgba(45,58,42,0.2) 0%, rgba(45,58,42,0.55) 55%, rgba(20,28,18,0.92) 100%)"
                  : "linear-gradient(180deg, rgba(40,25,45,0.15) 0%, rgba(60,30,55,0.55) 55%, rgba(30,15,30,0.92) 100%)",
              }}
            />
            {/* close（hero 上的，compact 出现时隐藏） */}
            <button
              onClick={onClose}
              aria-label="关闭"
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-opacity"
              style={{
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                color: "#fff",
                opacity: compact ? 0 : 1,
              }}
            >
              ✕
            </button>
            {/* badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="display italic text-[10px] tracking-[0.25em] px-2.5 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.18)", color: "#fff", backdropFilter: "blur(6px)" }}>
                {purchased ? "✓ UNLOCKED" : "✦ BUNDLE"}
              </span>
              {!purchased && (
                <span className="cn-serif text-[11px] px-2.5 py-1 rounded-full"
                  style={{ background: "#e85d3a", color: "#fff" }}>
                  限今日 · {discount}折
                </span>
              )}
            </div>
            {/* title block */}
            <div className="absolute left-5 right-5 bottom-4 text-white">
              <h3 className="cn-serif text-[22px] leading-snug">{bundle.title}</h3>
              <div className="cn-serif text-[13px] text-white/85 mt-1">{bundle.subtitle}</div>
              <div className="flex items-center gap-3 mt-3 cn-serif text-[12px] text-white/90">
                <span>★ {stats.rating}</span>
                <span className="opacity-50">·</span>
                <span>{stats.reviews} 条评价</span>
                <span className="opacity-50">·</span>
                <span>月售 {stats.sold}</span>
              </div>
              <div className="display italic text-[10px] text-white/55 mt-2">
                #{bundle.dealId}{city ? ` · ${city}` : ""}
              </div>
            </div>
          </div>


          {/* Price strip */}
          <div className="px-5 pt-4 pb-3 flex items-end justify-between border-b border-dashed"
            style={{ borderColor: "rgba(60,40,30,0.12)" }}>
            <div className="flex items-baseline gap-2">
              <span className="cn-serif text-[12px] text-[var(--ink-soft)]">套装价</span>
              <span className="cn-serif text-[32px] text-[#c44a2a] leading-none">¥{bundle.dealPrice}</span>
              {!purchased && saved > 0 && (
                <span className="display italic text-[12px] text-[var(--ink-soft)] line-through">
                  ¥{bundle.originalPrice}
                </span>
              )}
            </div>
            {!purchased && saved > 0 && (
              <span className="cn-serif text-[12px] px-2 py-0.5 rounded"
                style={{ background: "#fbe8d6", color: "#c44a2a" }}>
                立省 ¥{saved}
              </span>
            )}
          </div>

          {/* Perks chips */}
          <div className="px-5 pt-4">
            <div className="cn-serif text-[12px] text-[var(--ink-soft)] mb-2">套装福利</div>
            <div className="flex flex-wrap gap-2">
              {bundle.perks.map((p, i) => (
                <span key={i} className="cn-serif text-[12px] px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
                  style={{ background: "var(--muted)", color: "var(--ink)" }}>
                  <span>{perkIcons[i % perkIcons.length]}</span>{p}
                </span>
              ))}
            </div>
          </div>

          {/* Scenes — 横向相册 + 列表 */}
          <div className="px-5 pt-5">
            <div className="flex items-center justify-between mb-2">
              <div className="cn-serif text-[14px] text-[var(--ink)]">行程 · {scenes.length} 个场景</div>
              <div className="display italic text-[10px] text-[var(--ink-soft)] tracking-widest">
                {scenes.reduce((s, x) => s + (x.stay_minutes || 0), 0)} MIN TOTAL
              </div>
            </div>

            {/* 横向预览相册 */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory">
              {scenes.map((s, i) => (
                <div key={s.order} className="shrink-0 snap-start" style={{ width: 140 }}>
                  <div className="relative rounded-2xl overflow-hidden" style={{ height: 100 }}>
                    <img src={sceneThumbs[i]} alt={s.scene_name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.65) 100%)" }} />
                    <div className="absolute top-1.5 left-1.5 display italic text-[10px] text-white/95 px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(0,0,0,0.4)" }}>
                      0{s.order}
                    </div>
                    <div className="absolute bottom-1.5 left-2 right-2 cn-serif text-[11px] text-white truncate">
                      「{s.scene_name}」
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 详细列表 */}
            <ul className="mt-2 space-y-2">
              {scenes.map((s, i) => (
                <li key={s.order} className="flex items-center gap-3 p-2.5 rounded-2xl"
                  style={{ background: "rgba(60,40,30,0.04)" }}>
                  <img src={sceneThumbs[i]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="display italic text-[10px] text-[var(--ink-soft)]">0{s.order}</span>
                      <span className="cn-serif text-[14px] text-[var(--ink)] truncate">「{s.scene_name}」</span>
                    </div>
                    <div className="cn-serif text-[12px] text-[var(--ink-soft)] truncate">
                      {s.location_name} · ~{s.stay_minutes}min
                    </div>
                  </div>
                  <span className="cn-serif text-[11px] px-2 py-0.5 rounded shrink-0"
                    style={{ background: "#e3ebda", color: "#3d4a2a" }}>已含</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 推荐加购 */}
          <div className="px-5 pt-5">
            <div className="cn-serif text-[14px] text-[var(--ink)] mb-2">常被一起买</div>
            <div className="grid grid-cols-2 gap-3">
              {addOns.map((a, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(60,40,30,0.1)" }}>
                  <div className="relative" style={{ height: 90 }}>
                    <img src={a.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-2.5">
                    <div className="cn-serif text-[12px] text-[var(--ink)] truncate">{a.title}</div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="cn-serif text-[14px] text-[#c44a2a]">¥{a.price}</span>
                      <span className="display italic text-[10px] text-[var(--ink-soft)] line-through">¥{a.original}</span>
                    </div>
                    <div className="display italic text-[10px] text-[var(--ink-soft)] mt-0.5">月售 {a.sold}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 评价 */}
          <div className="px-5 pt-5 pb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="cn-serif text-[14px] text-[var(--ink)]">最新评价</div>
              <span className="cn-serif text-[12px] text-[var(--ink-soft)]">★ {stats.rating} · {stats.reviews} 条</span>
            </div>
            <div className="space-y-2">
              {[
                { name: "把生活过成诗", text: "三个场景串得很顺，最后一站咖啡馆刚好接住傍晚的光。" },
                { name: "城南的老周", text: "比单买便宜不少，老城墙那段意外好评，安静得想哭。" },
              ].map((c, i) => (
                <div key={i} className="p-3 rounded-2xl" style={{ background: "rgba(60,40,30,0.04)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="cn-serif text-[12px] text-[var(--ink)]">{c.name}</span>
                    <span className="display italic text-[10px] text-[#c9a84c]">★★★★★</span>
                  </div>
                  <div className="cn-serif text-[12px] text-[var(--ink-soft)] leading-relaxed">{c.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============ Sticky CTA ============ */}
        <div className="shrink-0 px-5 py-3 border-t flex items-center gap-3"
          style={{ borderColor: "rgba(60,40,30,0.1)", background: "var(--card)" }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="cn-serif text-[22px] text-[#c44a2a] leading-none">¥{bundle.dealPrice}</span>
              {!purchased && saved > 0 && (
                <span className="display italic text-[11px] text-[var(--ink-soft)] line-through">¥{bundle.originalPrice}</span>
              )}
            </div>
            <div className="display italic text-[10px] text-[var(--ink-soft)] mt-1">
              未到的场景自动退 · 演示流程，不真实扣款
            </div>
          </div>
          {purchased ? (
            <div className="cn-serif text-[13px] px-5 py-3 rounded-full"
              style={{ background: "#e3ebda", color: "#3d4a2a" }}>
              ✓ 已锁定 · 到店出示
            </div>
          ) : (
            <button onClick={onPurchased}
              className="cn-serif text-[13px] px-5 py-3 rounded-full shadow-lg"
              style={{ background: "linear-gradient(135deg, #e85d3a, #c44a2a)", color: "#fff" }}>
              立即锁定 ¥{bundle.dealPrice}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ Map ============ */

type MapThemeId = "forest" | "bloom" | "coast" | "dusk_city" | "sepia_alley" | "moonlit";

interface MapTheme {
  id: MapThemeId;
  bg: string;                  // container gradient
  hills: { d: string; fill: string; opacity: number }[];
  dotShades: string[];
  pathStroke: string;          // edge
  pathFillFrom: string;
  pathFillTo: string;
  pathDash: string;
  sun?: { cx: number; cy: number; r: number; core: string; halo: string };
  moon?: { cx: number; cy: number; r: number; color: string };
  pond?: { cx: number; cy: number; rx: number; ry: number; outer: string; inner: string };
  extras?: "waves" | "buildings" | "lanterns" | "petals" | "stars" | "fireflies";
  birdsColor?: string;
}

const FOREST: MapTheme = {
  id: "forest",
  bg: "linear-gradient(180deg, #eaf0df 0%, #d6e2c5 100%)",
  hills: [
    { d: "M 60 130 Q 130 60, 200 110 T 320 130 L 320 200 L 60 200 Z", fill: "#b8c9a0", opacity: 0.55 },
    { d: "M 30 200 Q 110 130, 200 180 T 340 190 L 340 280 L 30 280 Z", fill: "#9fb487", opacity: 0.6 },
    { d: "M 0 290 Q 100 240, 200 280 T 360 290 L 360 380 L 0 380 Z", fill: "#86a26f", opacity: 0.55 },
    { d: "M 0 400 Q 120 360, 200 400 T 360 410 L 360 560 L 0 560 Z", fill: "#739158", opacity: 0.45 },
  ],
  dotShades: ["#6f8a55", "#5d7846", "#88a36b", "#7a9560"],
  pathStroke: "#c9bf9e",
  pathFillFrom: "#fff8e8",
  pathFillTo: "#f3ead0",
  pathDash: "#fffdf3",
  sun: { cx: 200, cy: 30, r: 14, core: "#e8794a", halo: "#f4a261" },
  pond: { cx: 120, cy: 500, rx: 55, ry: 20, outer: "#a8c7d6", inner: "#bcd6e2" },
  birdsColor: "#5d7846",
};

const BLOOM: MapTheme = {
  id: "bloom",
  bg: "linear-gradient(180deg, #fbeaf0 0%, #f5d8e4 60%, #ead4e8 100%)",
  hills: [
    { d: "M 60 130 Q 130 60, 200 110 T 320 130 L 320 200 L 60 200 Z", fill: "#f3c3d4", opacity: 0.55 },
    { d: "M 30 200 Q 110 130, 200 180 T 340 190 L 340 280 L 30 280 Z", fill: "#e8a8c0", opacity: 0.6 },
    { d: "M 0 290 Q 100 240, 200 280 T 360 290 L 360 380 L 0 380 Z", fill: "#d88aae", opacity: 0.5 },
    { d: "M 0 400 Q 120 360, 200 400 T 360 410 L 360 560 L 0 560 Z", fill: "#c47a9e", opacity: 0.4 },
  ],
  dotShades: ["#e89ab8", "#d47ea4", "#f3b8cf", "#c46a92"],
  pathStroke: "#e8c2d2",
  pathFillFrom: "#fff5fa",
  pathFillTo: "#f8dfe9",
  pathDash: "#fffdf3",
  sun: { cx: 280, cy: 50, r: 16, core: "#f5a8c0", halo: "#fbd0de" },
  pond: { cx: 110, cy: 500, rx: 55, ry: 20, outer: "#e8c2d2", inner: "#f5d8e4" },
  extras: "petals",
  birdsColor: "#b8688a",
};

const COAST: MapTheme = {
  id: "coast",
  bg: "linear-gradient(180deg, #e0eef5 0%, #c8def0 50%, #a8c8e0 100%)",
  hills: [
    { d: "M 60 110 Q 130 50, 200 100 T 320 120 L 320 180 L 60 180 Z", fill: "#d8c8a8", opacity: 0.55 },
    { d: "M 0 190 Q 120 150, 200 180 T 360 195 L 360 260 L 0 260 Z", fill: "#e8d8b8", opacity: 0.6 },
    // sandy beach
    { d: "M 0 260 Q 180 240, 360 270 L 360 340 L 0 340 Z", fill: "#f3e8c8", opacity: 0.85 },
    // sea
    { d: "M 0 330 Q 180 320, 360 340 L 360 560 L 0 560 Z", fill: "#7fb0d0", opacity: 0.7 },
  ],
  dotShades: ["#a8b88a", "#8aa873", "#c4b890", "#9ab080"],
  pathStroke: "#e8d8b0",
  pathFillFrom: "#fff8e0",
  pathFillTo: "#f3e0b8",
  pathDash: "#fffdf3",
  sun: { cx: 290, cy: 40, r: 18, core: "#ff9e6a", halo: "#ffce9a" },
  extras: "waves",
  birdsColor: "#3a5a78",
};

const DUSK_CITY: MapTheme = {
  id: "dusk_city",
  bg: "linear-gradient(180deg, #3a2a4a 0%, #6a4a6a 40%, #d88a78 80%, #f5c89a 100%)",
  hills: [
    { d: "M 0 360 Q 100 330, 200 350 T 360 360 L 360 560 L 0 560 Z", fill: "#2a1a3a", opacity: 0.75 },
  ],
  dotShades: ["#ffe09a", "#ffc070", "#fff0c0", "#f5a878"],
  pathStroke: "#3a2a4a",
  pathFillFrom: "#fff5d8",
  pathFillTo: "#f5b878",
  pathDash: "#fffdf3",
  moon: { cx: 290, cy: 50, r: 14, color: "#fff5d8" },
  extras: "buildings",
  birdsColor: "#2a1a3a",
};

const SEPIA_ALLEY: MapTheme = {
  id: "sepia_alley",
  bg: "linear-gradient(180deg, #f3e6d0 0%, #e8d0b0 60%, #d8b890 100%)",
  hills: [
    { d: "M 60 130 Q 130 60, 200 110 T 320 130 L 320 200 L 60 200 Z", fill: "#c8a878", opacity: 0.5 },
    { d: "M 0 200 Q 100 160, 200 195 T 360 210 L 360 290 L 0 290 Z", fill: "#b89868", opacity: 0.55 },
    { d: "M 0 300 Q 120 260, 200 295 T 360 310 L 360 390 L 0 390 Z", fill: "#a08858", opacity: 0.5 },
    { d: "M 0 410 Q 120 370, 200 410 T 360 420 L 360 560 L 0 560 Z", fill: "#8c7448", opacity: 0.4 },
  ],
  dotShades: ["#8c7448", "#6e5a38", "#a08858", "#7e6a40"],
  pathStroke: "#8c7448",
  pathFillFrom: "#fff0d8",
  pathFillTo: "#e8c890",
  pathDash: "#fffdf3",
  sun: { cx: 200, cy: 40, r: 18, core: "#c46a3a", halo: "#e8a878" },
  extras: "lanterns",
  birdsColor: "#6e5a38",
};

const MOONLIT: MapTheme = {
  id: "moonlit",
  bg: "linear-gradient(180deg, #1a2440 0%, #2a3a5a 50%, #4a5a78 100%)",
  hills: [
    { d: "M 60 130 Q 130 60, 200 110 T 320 130 L 320 200 L 60 200 Z", fill: "#3a4a6a", opacity: 0.55 },
    { d: "M 30 200 Q 110 130, 200 180 T 340 190 L 340 280 L 30 280 Z", fill: "#2c3c5c", opacity: 0.6 },
    { d: "M 0 290 Q 100 240, 200 280 T 360 290 L 360 380 L 0 380 Z", fill: "#1f2f50", opacity: 0.65 },
    { d: "M 0 400 Q 120 360, 200 400 T 360 410 L 360 560 L 0 560 Z", fill: "#15243f", opacity: 0.65 },
  ],
  dotShades: ["#3a4a6a", "#2c3c5c", "#5a6a8a", "#4a5a78"],
  pathStroke: "#3a4a6a",
  pathFillFrom: "#e8e0f5",
  pathFillTo: "#b8b0d8",
  pathDash: "#fffdf3",
  moon: { cx: 290, cy: 55, r: 16, color: "#f5efdc" },
  pond: { cx: 120, cy: 500, rx: 55, ry: 20, outer: "#3a5a78", inner: "#5a7a98" },
  extras: "stars",
  birdsColor: "#8a9ab8",
};

const THEMES: Record<MapThemeId, MapTheme> = {
  forest: FOREST,
  bloom: BLOOM,
  coast: COAST,
  dusk_city: DUSK_CITY,
  sepia_alley: SEPIA_ALLEY,
  moonlit: MOONLIT,
};

// 按人设卡映射地图主题
const CARD_THEME: Record<string, MapThemeId> = {
  card_001: "forest",       // 治愈/自然
  card_002: "sepia_alley",  // 慵懒短时
  card_003: "dusk_city",    // 好奇热闹
  card_004: "coast",        // 冒险/燥
  card_005: "moonlit",      // 脆弱修复
  card_006: "sepia_alley",  // 怀旧释然
  card_007: "bloom",        // 感性记录
  card_008: "dusk_city",    // 紧张好奇
  card_009: "bloom",        // 想笑大声
  card_010: "moonlit",      // 慢一点
};

function getMapTheme(cardId: string): MapTheme {
  return THEMES[CARD_THEME[cardId] ?? "forest"];
}

function JourneyMap({
  scenes, completed, onPick, cardId, city,
}: {
  scenes: JourneyScene[];
  completed: number[];
  onPick: (s: JourneyScene) => void;
  cardId: string;
  city?: string;
}) {
  const W = 360;
  const H = 560;
  const theme = getMapTheme(cardId);

  // Seeded pseudo-random for stable distances per card
  const seedHash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };

  const pathD = "M 200 40 C 110 110, 280 180, 180 250 S 90 360, 200 430 S 280 510, 170 540";

  const points = useMemo(() => {
    const n = scenes.length;
    if (typeof document === "undefined") {
      return scenes.map((_, i) => ({ x: 180 + (i % 2 === 0 ? -40 : 40), y: 80 + (i * 420) / (n - 1 || 1) }));
    }
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", pathD);
    svg.appendChild(p);
    const total = p.getTotalLength();
    return scenes.map((_, i) => {
      const t = ((i + 1) / (n + 1)) * total;
      const pt = p.getPointAtLength(t);
      return { x: pt.x, y: pt.y };
    });
  }, [scenes]);

  // 交通偏好（来自 agent 对话）
  const [transport, setTransport] = useState<string>(() => {
    if (typeof window === "undefined") return "步行";
    return localStorage.getItem("today.transport") || "步行";
  });
  const [copied, setCopied] = useState(false);

  const transportMeta = useMemo(() => {
    switch (transport) {
      case "骑行": return { label: "骑行", icon: "🚲", travelmode: "bicycling", speedMps: 4.2 };
      case "公交": return { label: "公交", icon: "🚇", travelmode: "transit", speedMps: 6.5 };
      case "打车": return { label: "打车", icon: "🚖", travelmode: "driving", speedMps: 8.5 };
      case "自驾": return { label: "自驾", icon: "🚗", travelmode: "driving", speedMps: 8.5 };
      default: return { label: "步行", icon: "🚶", travelmode: "walking", speedMps: 1.25 };
    }
  }, [transport]);

  // 段距离（米）+ 到达分钟，基于稳定 hash + 当前交通方式
  const segments = useMemo(() => {
    return scenes.slice(0, -1).map((s, i) => {
      const next = scenes[i + 1];
      const h = seedHash(`${cardId}-${s.location_name}-${next.location_name}`);
      const meters = 300 + (h % 1100); // 300~1400m
      const minutes = Math.max(2, Math.round(meters / (transportMeta.speedMps * 60)));
      const label = meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters / 10) * 10}m`;
      return { meters, minutes, label };
    });
  }, [scenes, cardId, transportMeta]);

  const totalMeters = segments.reduce((s, x) => s + x.meters, 0);
  const travelMinutes = segments.reduce((s, x) => s + x.minutes, 0);
  const stayMinutes = scenes.reduce((s, x) => s + (x.stay_minutes || 0), 0);
  const totalMinutes = travelMinutes + stayMinutes;
  const totalLabel = totalMeters >= 1000 ? `${(totalMeters / 1000).toFixed(1)}km` : `${totalMeters}m`;
  const fmtDur = (m: number) => {
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r === 0 ? `${h}h` : `${h}h${r}min`;
  };

  // 一键打开完整路线
  const routeHref = useMemo(() => {
    if (scenes.length === 0) return "#";
    const names = scenes.map((s) => `${city ?? ""}${s.location_name}`).filter(Boolean);
    const origin = encodeURIComponent(names[0]);
    const destination = encodeURIComponent(names[names.length - 1]);
    const waypoints = names.slice(1, -1).map(encodeURIComponent).join("|");
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ""}&travelmode=${transportMeta.travelmode}`;
  }, [scenes, city, transportMeta]);

  async function shareRoute() {
    const text = `我的今日路线 · ${transportMeta.icon}${transportMeta.label}\n${scenes.map((s, i) => `${i + 1}. ${s.location_name}`).join("\n")}\n${routeHref}`;
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title: "今日路线", text, url: routeHref });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  // 按主题决定圆点遮罩区域（避免压在沙滩/海/天空上）
  const dotYMax = theme.extras === "waves" ? 340 : theme.extras === "buildings" ? 350 : 530;
  const dotYMin = theme.extras === "stars" || theme.extras === "buildings" ? 200 : 90;

  return (
    <div
      className="relative rounded-3xl overflow-hidden shadow-[0_20px_50px_-30px_rgba(80,90,60,0.5)]"
      style={{ background: theme.bg }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto">
        <defs>
          <radialGradient id={`sun-${theme.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={theme.sun?.halo ?? "#f4a261"} stopOpacity="1" />
            <stop offset="100%" stopColor={theme.sun?.halo ?? "#f4a261"} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`pathGrad-${theme.id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={theme.pathFillFrom} />
            <stop offset="100%" stopColor={theme.pathFillTo} />
          </linearGradient>
        </defs>

        {/* 星星（夜空主题） */}
        {theme.extras === "stars" && Array.from({ length: 32 }).map((_, i) => {
          const x = 10 + ((i * 47) % 340);
          const y = 20 + ((i * 31) % 170);
          const r = 0.6 + ((i * 13) % 8) / 10;
          return <circle key={`s-${i}`} cx={x} cy={y} r={r} fill="#fff5d8" opacity={0.55 + (i % 5) * 0.08} />;
        })}

        {/* 太阳 / 月亮 */}
        {theme.sun && (
          <>
            <ellipse cx={theme.sun.cx} cy={theme.sun.cy} rx={theme.sun.r * 2.4} ry={theme.sun.r * 2.4} fill={`url(#sun-${theme.id})`} />
            <circle cx={theme.sun.cx} cy={theme.sun.cy} r={theme.sun.r * 0.5} fill={theme.sun.core} opacity={0.9} />
          </>
        )}
        {theme.moon && (
          <>
            <circle cx={theme.moon.cx} cy={theme.moon.cy} r={theme.moon.r * 1.6} fill={theme.moon.color} opacity={0.18} />
            <circle cx={theme.moon.cx} cy={theme.moon.cy} r={theme.moon.r} fill={theme.moon.color} />
            <circle cx={theme.moon.cx + theme.moon.r * 0.35} cy={theme.moon.cy - theme.moon.r * 0.15} r={theme.moon.r * 0.95} fill={theme.bg.includes("1a2440") ? "#1a2440" : "#3a2a4a"} />
          </>
        )}

        {/* 山形 */}
        {theme.hills.map((h, i) => (
          <path key={`h-${i}`} d={h.d} fill={h.fill} opacity={h.opacity} />
        ))}

        {/* 城市建筑剪影 */}
        {theme.extras === "buildings" && (
          <g opacity="0.85">
            {[
              { x: 20, h: 70 }, { x: 50, h: 110 }, { x: 78, h: 85 }, { x: 105, h: 140 },
              { x: 135, h: 95 }, { x: 165, h: 165 }, { x: 200, h: 120 }, { x: 235, h: 175 },
              { x: 270, h: 100 }, { x: 300, h: 145 }, { x: 332, h: 90 },
            ].map((b, i) => (
              <g key={`b-${i}`}>
                <rect x={b.x} y={350 - b.h} width={22} height={b.h} fill="#1a0e26" />
                {Array.from({ length: Math.floor(b.h / 18) }).map((_, j) => (
                  <rect key={j} x={b.x + 4 + ((i + j) % 2) * 9} y={350 - b.h + 8 + j * 18} width={4} height={5} fill="#ffe09a" opacity={(i * j) % 3 === 0 ? 0.95 : 0.5} />
                ))}
              </g>
            ))}
          </g>
        )}

        {/* 灯笼（旧巷主题） */}
        {theme.extras === "lanterns" && Array.from({ length: 6 }).map((_, i) => {
          const x = 40 + i * 55;
          const y = 70 + (i % 2) * 18;
          return (
            <g key={`l-${i}`}>
              <line x1={x} y1={50} x2={x} y2={y - 6} stroke="#6e5a38" strokeWidth="0.8" />
              <ellipse cx={x} cy={y} rx={6} ry={8} fill="#e8794a" opacity="0.9" />
              <ellipse cx={x} cy={y} rx={9} ry={11} fill="#f5a878" opacity="0.25" />
            </g>
          );
        })}

        {/* 花瓣 */}
        {theme.extras === "petals" && Array.from({ length: 18 }).map((_, i) => {
          const x = 15 + ((i * 67) % 340);
          const y = 30 + ((i * 41) % 500);
          return <circle key={`p-${i}`} cx={x} cy={y} r={1.8} fill="#f5b8c4" opacity={0.7} />;
        })}

        {/* 树点 */}
        {Array.from({ length: 36 }).map((_, i) => {
          const x = 20 + ((i * 53) % 320);
          const yRaw = 90 + ((i * 71) % 440);
          const y = Math.min(Math.max(yRaw, dotYMin), dotYMax);
          const r = 3 + ((i * 7) % 5);
          return <circle key={`d-${i}`} cx={x} cy={y} r={r} fill={theme.dotShades[i % theme.dotShades.length]} opacity={0.7} />;
        })}

        {/* 海浪线（海边主题） */}
        {theme.extras === "waves" && Array.from({ length: 5 }).map((_, i) => (
          <path
            key={`w-${i}`}
            d={`M 0 ${380 + i * 35} Q 90 ${370 + i * 35}, 180 ${380 + i * 35} T 360 ${380 + i * 35}`}
            stroke="#fffdf3"
            strokeWidth="1.2"
            fill="none"
            opacity={0.4 - i * 0.05}
          />
        ))}

        {/* 路径 */}
        <path d={pathD} stroke={theme.pathStroke} strokeWidth="22" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d={pathD} stroke={`url(#pathGrad-${theme.id})`} strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d={pathD} stroke={theme.pathDash} strokeWidth="2" strokeDasharray="2 8" fill="none" strokeLinecap="round" opacity="0.7" />

        {/* 池塘 */}
        {theme.pond && (
          <>
            <ellipse cx={theme.pond.cx} cy={theme.pond.cy} rx={theme.pond.rx} ry={theme.pond.ry} fill={theme.pond.outer} opacity="0.7" />
            <ellipse cx={theme.pond.cx} cy={theme.pond.cy} rx={theme.pond.rx * 0.72} ry={theme.pond.ry * 0.65} fill={theme.pond.inner} opacity="0.6" />
          </>
        )}

        {/* 飞鸟 */}
        {theme.birdsColor && (
          <>
            <path d="M 70 90 q 4 -4 8 0 q 4 -4 8 0" stroke={theme.birdsColor} strokeWidth="1.2" fill="none" />
            <path d="M 290 220 q 3 -3 6 0 q 3 -3 6 0" stroke={theme.birdsColor} strokeWidth="1.2" fill="none" />
          </>
        )}
      </svg>

      {/* Scene markers */}
      {points.map((pt, i) => {
        const scene = scenes[i];
        const done = completed.includes(scene.order);
        const kind = detectVenue(scene.location_type, scene.location_name);
        return (
          <button
            key={scene.order}
            onClick={() => onPick(scene)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${(pt.x / W) * 100}%`, top: `${(pt.y / H) * 100}%` }}
          >
            <div className="relative flex flex-col items-center">
              <div
                className="relative rounded-full transition-transform group-hover:scale-110"
                style={{
                  width: 56, height: 56,
                  background: "radial-gradient(circle at 50% 40%, #fffdf3 0%, #f3ead0 65%, transparent 100%)",
                  filter: done ? "saturate(1.1)" : "none",
                  boxShadow: "0 6px 14px rgba(80,90,60,0.35)",
                }}
              >
                <VenueIcon kind={kind} size={56} />
                <div
                  className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center display text-[10px]"
                  style={{
                    background: done ? "linear-gradient(160deg,#f5b8c4,#e8c97a)" : "#fff8e8",
                    color: "#3d3530",
                    border: "1.5px solid #fff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                  }}
                >
                  {done ? "✓" : scene.order}
                </div>
              </div>
              <div
                className="mt-1 cn-serif text-[11px] whitespace-nowrap px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,253,243,0.95)", color: "#3d3530", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}
              >
                {scene.scene_name}
              </div>
              {scene.location_hint && (
                <div
                  className="mt-1 display italic text-[9.5px] tracking-[0.12em] px-1.5 py-[1px] rounded-full whitespace-nowrap"
                  style={{ background: "rgba(255,253,243,0.7)", color: "#6b5b4a" }}
                >
                  ◉ {scene.location_hint}
                </div>
              )}
            </div>
          </button>
        );
      })}

      {/* Segment distance chips (between consecutive points) */}
      {segments.map((seg, i) => {
        const a = points[i];
        const b = points[i + 1];
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        // 偏移避开路径
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const ox = mx + nx * 26;
        const oy = my + ny * 26;
        return (
          <div
            key={`seg-${i}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${(ox / W) * 100}%`, top: `${(oy / H) * 100}%` }}
          >
            <div
              className="display italic text-[9.5px] tracking-[0.1em] px-2 py-[2px] rounded-full whitespace-nowrap"
              style={{
                background: "rgba(255,253,243,0.92)",
                color: "#5a4a3a",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              → {seg.label} · {seg.minutes}min
            </div>
          </div>
        );
      })}

      {/* Route summary + open in maps */}
      <div className="absolute left-3 right-3 bottom-3 flex items-end justify-between gap-2">
        <div className="flex flex-col gap-1.5 items-start">
          <button
            onClick={() => {
              const order = ["步行", "骑行", "公交", "打车", "自驾"];
              const next = order[(order.indexOf(transport) + 1) % order.length];
              setTransport(next);
              try { localStorage.setItem("today.transport", next); } catch {}
            }}
            className="display italic text-[10px] tracking-[0.15em] px-2.5 py-1 rounded-full hover:opacity-90 transition"
            style={{ background: "rgba(255,253,243,0.92)", color: "#5a4a3a", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
            title="点击切换交通方式"
          >
            {transportMeta.icon} 全程约 {fmtDur(totalMinutes)} · {transportMeta.label} {totalLabel}（游览 {fmtDur(stayMinutes)}）
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={shareRoute}
            className="cn-serif text-[11.5px] px-3 py-1.5 rounded-full flex items-center gap-1.5 transition hover:opacity-90"
            style={{ background: "rgba(255,253,243,0.95)", color: "#3d3530", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
            title="分享路线给朋友"
          >
            <span>{copied ? "✓" : "🔗"}</span>
            <span>{copied ? "已复制" : "分享"}</span>
          </button>
          <a
            href={routeHref}
            target="_blank"
            rel="noreferrer"
            className="cn-serif text-[11.5px] px-3 py-1.5 rounded-full flex items-center gap-1.5 transition hover:opacity-90"
            style={{ background: "#3d3530", color: "#fffdf3", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}
          >
            <span>📍</span>
            <span>加入地图</span>
          </a>
        </div>
      </div>
    </div>
  );
}


/* ============ Scene bottom sheet ============ */

function SceneSheet({
  scene, done, record, city, onClose, onUpdated, bundlePurchased,
}: {
  scene: JourneyScene;
  done: boolean;
  record?: SceneRecord;
  city?: string;
  onClose: () => void;
  onUpdated: () => void;
  bundlePurchased?: boolean;
}) {
  const mapHref = `https://uri.amap.com/marker?name=${encodeURIComponent(scene.location_name)}&src=todaypersona&coordinate=gaode&callnative=1`;
  const meituanHref = `https://i.meituan.com/s/${encodeURIComponent(scene.meituan_keyword || scene.location_name)}`;
  const kind = detectVenue(scene.location_type, scene.location_name);

  // Pick a hero background per venue family
  const heroBg: Record<string, string> = {
    cafe: "linear-gradient(160deg,#f3e6d2 0%,#e8c2a0 100%)",
    bakery: "linear-gradient(160deg,#fff1d6 0%,#f5d68a 100%)",
    dessert: "linear-gradient(160deg,#fde4ea 0%,#f5b8c4 100%)",
    bar: "linear-gradient(160deg,#3d3a4a 0%,#5a4d70 100%)",
    noodle: "linear-gradient(160deg,#fff1d6 0%,#f5a98a 100%)",
    restaurant: "linear-gradient(160deg,#fde4d0 0%,#e89a7a 100%)",
    market: "linear-gradient(160deg,#fff1d6 0%,#e89a8a 100%)",
    bookstore: "linear-gradient(160deg,#e8efd8 0%,#a8c08a 100%)",
    flower: "linear-gradient(160deg,#fde4ea 0%,#f5b8c4 60%,#a8c7d6 100%)",
    plant: "linear-gradient(160deg,#e8efd8 0%,#8aa873 100%)",
    park: "linear-gradient(160deg,#dfeacd 0%,#a8c08a 100%)",
    gallery: "linear-gradient(160deg,#f5ecda 0%,#d8c8b8 100%)",
    museum: "linear-gradient(160deg,#f5ecda 0%,#d8c8b8 100%)",
    cinema: "linear-gradient(160deg,#3d3a4a 0%,#7a5a8a 100%)",
    spa: "linear-gradient(160deg,#e0eef2 0%,#a8c7d6 100%)",
    temple: "linear-gradient(160deg,#f5d68a 0%,#c47a5b 100%)",
    river: "linear-gradient(160deg,#e0eef2 0%,#7ea8bd 100%)",
    street: "linear-gradient(160deg,#fde4d0 0%,#e85d6f 100%)",
    shop: "linear-gradient(160deg,#fff1d6 0%,#c9bf9e 100%)",
    default: "linear-gradient(160deg,#f3e6f5 0%,#a78bf0 100%)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center fade-in" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(40,35,30,0.45)", backdropFilter: "blur(4px)" }} />
      <div
        className="relative w-full max-w-xl rounded-t-[32px] overflow-hidden bg-[var(--card)] fade-up"
        style={{ maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -20px 60px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero illustration with interactive hotspots */}
        <SceneHero
          kind={kind}
          heroBg={heroBg[kind] || heroBg.default}
          sceneOrder={scene.order}
          onClose={onClose}
          done={done}
          sceneNo={scene.order}
        />


        <div className="p-6 pt-5">
          <h3 className="cn-serif text-[22px] text-[var(--ink)] leading-snug">「{scene.scene_name}」</h3>
          <div className="cn-serif text-[13px] text-[var(--ink-soft)] mt-1">
            {scene.location_name} <span className="opacity-70 ml-1">· {scene.location_type}</span>
          </div>
          {scene.location_hint && (
            <div className="cn-serif text-[12px] text-[var(--ink-soft)] mt-1 flex items-center gap-1.5">
              <span>📍</span>
              <span>{scene.location_hint}{city ? ` · ${city}` : ""}</span>
              <span className="opacity-60">· 停留~{scene.stay_minutes}min</span>
            </div>
          )}

          {needsReservation(kind) && (
            <ReservationCard
              kind={kind}
              scene={scene}
              city={city}
              record={record}
              onUpdated={onUpdated}
            />
          )}

          {bundlePurchased && (
            <div
              className="mt-3 px-3 py-2 rounded-2xl flex items-center justify-between gap-2"
              style={{ background: "linear-gradient(135deg,#2d3a2a 0%,#4a5a3d 100%)", color: "#fff" }}
            >
              <div className="cn-serif text-[12px] leading-tight">
                ✓ 已包含在「今日全程套装」
                <span className="display italic text-[10px] text-white/70 ml-1">到店出示即可核销</span>
              </div>
              <div className="display italic text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }}>
                BUNDLE
              </div>
            </div>
          )}

          {/* ✦ 第一眼吸引：实景大图 + 卖点 hook */}
          <AppealHook
            kind={kind}
            sceneName={scene.scene_name}
            narrative={scene.persona_narrative}
            emotionTags={scene.emotion_tags}
            stayMinutes={scene.stay_minutes}
          />

          {/* Decorative divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,transparent,#d8c8b8,transparent)" }} />
            <div className="display italic text-[11px] text-[var(--ink-soft)]">叙事</div>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,transparent,#d8c8b8,transparent)" }} />
          </div>

          <p className="cn-serif text-[15px] leading-[1.95] text-[var(--ink)] first-letter:text-[26px] first-letter:font-serif first-letter:mr-1">
            {scene.persona_narrative}
          </p>

          <SceneBuzz
            sceneName={scene.scene_name}
            locationName={scene.location_name}
            locationType={scene.location_type}
            kind={kind}
            city={city}
          />



          {/* ✦ 本场团购 & 推荐 */}
          <SceneDeals
            kind={kind}
            sceneOrder={scene.order}
            meituanHref={meituanHref}
            bundlePurchased={bundlePurchased}
          />

          {/* Task card */}
          <div
            className="mt-5 p-4 rounded-2xl relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, oklch(0.97 0.04 60) 0%, oklch(0.95 0.06 30) 100%)",
              border: "1px solid oklch(0.88 0.06 50)",
            }}
          >
            <div className="absolute top-2 right-3 display text-[24px] opacity-15">✦</div>
            <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)] mb-2">
              YOUR TASK · 今日行动
            </div>
            <div className="cn-serif text-[15px] text-[var(--ink)] leading-relaxed italic">
              {scene.action_task}
            </div>
          </div>

          {scene.emotion_tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {scene.emotion_tags.map((t) => (
                <span key={t} className="cn-serif text-[11px] px-2.5 py-1 rounded-full bg-[var(--muted)] text-[var(--ink-soft)]">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 space-y-2">
            <a
              href={mapHref}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-[var(--ink)] text-[var(--card)] shadow-[0_8px_24px_-12px_var(--ink)] hover:opacity-95 transition"
            >
              <span className="flex items-center gap-3">
                <span className="text-lg">🧭</span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[15px] font-medium">去这里</span>
                  <span className="cn-serif text-[11px] opacity-70">打开地图导航</span>
                </span>
              </span>
              <span className="text-base transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href={meituanHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 text-[12px] text-[var(--ink-soft)] hover:text-[var(--ink)] transition py-1"
            >
              在美团查看店铺详情 <span className="opacity-60">↗</span>
            </a>
          </div>

          <CheckInPanel
            sceneOrder={scene.order}
            done={done}
            record={record}
            onUpdated={onUpdated}
          />

        </div>
      </div>
    </div>

  );
}

/* ============ Reservation card ============ */

function ReservationCard({
  kind, scene, city, record, onUpdated,
}: {
  kind: import("@/components/VenueIcon").VenueKind;
  scene: JourneyScene;
  city?: string;
  record?: SceneRecord;
  onUpdated: () => void;
}) {
  const [justReserved, setJustReserved] = useState(false);
  const reserved = record?.reserved ?? false;
  const meituanHref = buildMeituanReserveHref(scene.meituan_keyword || scene.location_name, city);
  const dianpingHref = buildDianpingReserveHref(scene.meituan_keyword || scene.location_name, city);

  function markReserved() {
    reserveScene(scene.order, true);
    setJustReserved(true);
    setTimeout(() => setJustReserved(false), 2000);
    onUpdated();
    toast.success("已标记预约 ✓", { description: `「${scene.location_name}」记得按时到店` });
  }

  function cancelReserved() {
    reserveScene(scene.order, false);
    onUpdated();
    toast("已取消预约标记");
  }

  return (
    <div
      className="mt-3 p-4 rounded-2xl border"
      style={{
        background: reserved
          ? "linear-gradient(135deg, #e8f5e9 0%, #d4edda 100%)"
          : "linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%)",
        borderColor: reserved ? "#c8e6c9" : "#ffe0b2",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg"
          style={{ background: reserved ? "#a5d6a7" : "#ffcc80" }}>
          {reserved ? "✓" : "⏰"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="cn-serif text-[13px] text-[var(--ink)]">
            {reserved ? `已预约 · ${getReservationLabel(kind)}` : `建议提前${getReservationLabel(kind)}`}
          </div>
          <div className="cn-serif text-[11.5px] text-[var(--ink-soft)] mt-0.5">
            {getReservationHint(kind)}
          </div>

          {!reserved ? (
            <div className="flex items-center gap-2 mt-2.5">
              <a
                href={meituanHref}
                target="_blank"
                rel="noreferrer"
                onClick={markReserved}
                className="cn-serif text-[12px] px-3 py-1.5 rounded-full transition hover:opacity-90"
                style={{ background: "#e85d3a", color: "#fff" }}
              >
                在美团{getReservationLabel(kind)} →
              </a>
              <a
                href={dianpingHref}
                target="_blank"
                rel="noreferrer"
                onClick={markReserved}
                className="cn-serif text-[12px] px-3 py-1.5 rounded-full transition hover:opacity-90"
                style={{ background: "#ff9900", color: "#fff" }}
              >
                在大众{getReservationLabel(kind)} →
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2.5">
              <span className="cn-serif text-[12px] px-3 py-1.5 rounded-full"
                style={{ background: "#c8e6c9", color: "#2e7d32" }}>
                {justReserved ? "刚刚标记 ✓" : "已完成预约"}
              </span>
              <button
                onClick={cancelReserved}
                className="cn-serif text-[11px] text-[var(--ink-soft)] underline-offset-4 hover:underline"
              >
                取消标记
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ Reservation summary (global checklist) ============ */

function ReservationSummaryCard({
  scenes, sceneRecords, city, onPick,
}: {
  scenes: JourneyScene[];
  sceneRecords: Record<number, SceneRecord>;
  city?: string;
  onPick: (scene: JourneyScene) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const items = useMemo(() => {
    return scenes
      .map((s) => ({ scene: s, kind: detectVenue(s.location_type, s.location_name) }))
      .filter(({ kind }) => needsReservation(kind))
      .map(({ scene, kind }) => ({
        scene,
        kind,
        reserved: !!sceneRecords[scene.order]?.reserved,
      }));
  }, [scenes, sceneRecords]);

  if (items.length === 0) return null;

  const reservedCount = items.filter((i) => i.reserved).length;
  const allDone = reservedCount === items.length;

  return (
    <div
      className="rounded-2xl overflow-hidden border transition"
      style={{
        background: allDone
          ? "linear-gradient(135deg, #e8f5e9 0%, #d4edda 100%)"
          : "linear-gradient(135deg, #fff8f0 0%, #fdf0e8 100%)",
        borderColor: allDone ? "#c8e6c9" : "var(--border)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -16px rgba(60,40,30,0.18)",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base"
            style={{ background: allDone ? "#a5d6a7" : "#ffcc80" }}>
            {allDone ? "✓" : "⏰"}
          </div>
          <div>
            <div className="cn-serif text-[14px] text-[var(--ink)]">
              {allDone ? "今日预约已全部完成" : `今日有 ${items.length} 处建议预约`}
            </div>
            <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-0.5">
              {allDone
                ? "出发吧，一切已就绪 ✦"
                : `已完成 ${reservedCount}/${items.length} · 点击展开清单`}
            </div>
          </div>
        </div>
        <span className="text-[var(--ink-soft)] transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {items.map(({ scene, kind, reserved }) => (
            <button
              key={scene.order}
              onClick={() => onPick(scene)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition hover:bg-white/60"
              style={{ background: "rgba(255,255,255,0.5)" }}
            >
              <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px]"
                style={{
                  background: reserved ? "#c8e6c9" : "#ffe0b2",
                  color: reserved ? "#2e7d32" : "#e65100",
                }}>
                {reserved ? "✓" : scene.order}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="cn-serif text-[13px] text-[var(--ink)] truncate">{scene.location_name}</div>
                <div className="cn-serif text-[11px] text-[var(--ink-soft)]">
                  {getReservationLabel(kind)} · {scene.scene_name}
                </div>
              </div>
              {!reserved && (
                <span className="shrink-0 cn-serif text-[11px] px-2 py-0.5 rounded-full"
                  style={{ background: "#fff3e0", color: "#e65100" }}>
                  待预约
                </span>
              )}
            </button>
          ))}
          <div className="cn-serif text-[11px] text-[var(--ink-soft)] text-center pt-1">
            点击场景可直接跳转预约 · 美团 / 大众点评
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Per-scene deals & recommendations ============ */

function SceneDeals({
  kind, sceneOrder, meituanHref, bundlePurchased,
}: {
  kind: string;
  sceneOrder: number;
  meituanHref: string;
  bundlePurchased?: boolean;
}) {
  const deals = useMemo<SceneDeal[]>(() => getSceneDeals(kind, sceneOrder), [kind, sceneOrder]);
  if (!deals.length) return null;
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between mb-2">
        <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
          TODAY&apos;S DEALS · 本场优惠
        </div>
        <a
          href={meituanHref}
          target="_blank"
          rel="noreferrer"
          className="display italic text-[11px] text-[var(--ink-soft)] hover:underline underline-offset-4"
        >
          更多 →
        </a>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {deals.map((d, i) => {
          const save = d.original - d.price;
          return (
            <a
              key={i}
              href={meituanHref}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--ink-soft)] transition"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cn-serif text-[10px] tracking-[0.15em]"
                style={{
                  background: "linear-gradient(135deg, oklch(0.95 0.05 60), oklch(0.92 0.07 40))",
                  color: "oklch(0.45 0.12 50)",
                }}
              >
                {d.tag}
              </div>
              <div className="flex-1 min-w-0">
                <div className="cn-serif text-[13.5px] text-[var(--ink)] leading-snug truncate">
                  {d.title}
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="cn-serif text-[15px] text-[var(--ink)] leading-none">¥{d.price}</span>
                  <span className="display italic text-[10.5px] text-[var(--ink-soft)] line-through">¥{d.original}</span>
                  <span className="display italic text-[10px] text-[oklch(0.55_0.18_30)]">省 ¥{save}</span>
                  <span className="ml-auto display italic text-[10px] text-[var(--ink-soft)]">{d.sold}</span>
                </div>
              </div>
              <span className="cn-serif text-[12px] text-[var(--ink-soft)] group-hover:translate-x-0.5 transition">→</span>
            </a>
          );
        })}
      </div>
      {bundlePurchased && (
        <p className="cn-serif text-[11px] text-[var(--ink-soft)] italic mt-2 text-center">
          已锁定「今日全程套装」· 本场可直接核销，无需额外下单
        </p>
      )}
    </div>
  );
}

/* ============ Interactive hero with collectibles ============ */

type Hotspot = {
  x: number; // %
  y: number; // %
  emoji: string;
  reward: string;
  toastTitle: string;
};

const HOTSPOT_MAP: Record<string, Hotspot[]> = {
  cafe: [
    { x: 38, y: 32, emoji: "☁️", reward: "+ 一缕咖啡蒸汽", toastTitle: "蒸汽收集 ×1" },
    { x: 52, y: 22, emoji: "☁️", reward: "+ 又一缕香气", toastTitle: "蒸汽收集 ×2" },
    { x: 65, y: 38, emoji: "✦", reward: "+ 拿铁拉花", toastTitle: "拉花完成" },
  ],
  bakery: [
    { x: 30, y: 30, emoji: "🥐", reward: "+ 黄油可颂", toastTitle: "刚出炉" },
    { x: 70, y: 28, emoji: "☁️", reward: "+ 烤箱暖气", toastTitle: "暖气收集" },
    { x: 50, y: 70, emoji: "✦", reward: "+ 第一口", toastTitle: "试吃 +1" },
  ],
  dessert: [
    { x: 35, y: 35, emoji: "🍓", reward: "+ 草莓装饰", toastTitle: "甜品 +1" },
    { x: 65, y: 30, emoji: "✦", reward: "+ 糖霜星点", toastTitle: "糖霜亮起" },
    { x: 50, y: 65, emoji: "🍰", reward: "+ 切下一角", toastTitle: "记得拍照" },
  ],
  noodle: [
    { x: 40, y: 28, emoji: "☁️", reward: "+ 热气一团", toastTitle: "蒸汽 ×1" },
    { x: 60, y: 24, emoji: "☁️", reward: "+ 热气又一团", toastTitle: "蒸汽 ×2" },
    { x: 50, y: 65, emoji: "🥢", reward: "+ 开动！", toastTitle: "开吃" },
  ],
  restaurant: [
    { x: 35, y: 30, emoji: "☁️", reward: "+ 锅气", toastTitle: "锅气收集" },
    { x: 65, y: 35, emoji: "🍷", reward: "+ 干杯", toastTitle: "举杯 +1" },
    { x: 50, y: 70, emoji: "✦", reward: "+ 这一顿值得", toastTitle: "满足度 +1" },
  ],
  bar: [
    { x: 30, y: 28, emoji: "✦", reward: "+ 灯光亮起", toastTitle: "霓虹点亮" },
    { x: 70, y: 32, emoji: "🍸", reward: "+ 这杯归你", toastTitle: "鸡尾酒就位" },
    { x: 50, y: 68, emoji: "🎵", reward: "+ 一段慢歌", toastTitle: "音符飘过" },
  ],
  market: [
    { x: 28, y: 35, emoji: "🍅", reward: "+ 新鲜番茄", toastTitle: "市集 +1" },
    { x: 70, y: 30, emoji: "🥬", reward: "+ 一把青菜", toastTitle: "市集 +2" },
    { x: 50, y: 70, emoji: "✦", reward: "+ 烟火气", toastTitle: "采买完成" },
  ],
  bookstore: [
    { x: 30, y: 30, emoji: "📖", reward: "+ 翻开一页", toastTitle: "书页翻动" },
    { x: 70, y: 35, emoji: "✦", reward: "+ 一句喜欢的话", toastTitle: "记下来了" },
    { x: 50, y: 68, emoji: "🕯️", reward: "+ 暖光", toastTitle: "灯光点亮" },
  ],
  gallery: [
    { x: 30, y: 32, emoji: "🖼️", reward: "+ 驻足一幅", toastTitle: "凝视 +1" },
    { x: 70, y: 32, emoji: "✦", reward: "+ 射灯打开", toastTitle: "灯亮了" },
    { x: 50, y: 68, emoji: "💭", reward: "+ 一个念头", toastTitle: "灵感闪过" },
  ],
  museum: [
    { x: 30, y: 32, emoji: "🏺", reward: "+ 一件展品", toastTitle: "凝视 +1" },
    { x: 70, y: 32, emoji: "✦", reward: "+ 灯光亮起", toastTitle: "射灯打开" },
    { x: 50, y: 68, emoji: "📜", reward: "+ 一段说明", toastTitle: "读完了" },
  ],
  cinema: [
    { x: 30, y: 32, emoji: "✦", reward: "+ 灯光暗下", toastTitle: "影厅就绪" },
    { x: 70, y: 32, emoji: "🎬", reward: "+ 开场了", toastTitle: "故事开始" },
    { x: 50, y: 68, emoji: "🍿", reward: "+ 一桶爆米花", toastTitle: "零食 +1" },
  ],
  flower: [
    { x: 30, y: 30, emoji: "🌸", reward: "+ 一束花", toastTitle: "花束 +1" },
    { x: 70, y: 30, emoji: "🦋", reward: "+ 蝴蝶停驻", toastTitle: "蝴蝶飞来" },
    { x: 50, y: 68, emoji: "✦", reward: "+ 花香一缕", toastTitle: "花香收集" },
  ],
  plant: [
    { x: 30, y: 32, emoji: "🌿", reward: "+ 一片新叶", toastTitle: "绿意 +1" },
    { x: 70, y: 35, emoji: "💧", reward: "+ 浇水一次", toastTitle: "照顾 +1" },
    { x: 50, y: 68, emoji: "🦋", reward: "+ 蝴蝶停驻", toastTitle: "客人来了" },
  ],
  park: [
    { x: 28, y: 32, emoji: "🦋", reward: "+ 蝴蝶飞过", toastTitle: "蝴蝶收集" },
    { x: 70, y: 28, emoji: "🐦", reward: "+ 一声鸟鸣", toastTitle: "鸟鸣 +1" },
    { x: 50, y: 70, emoji: "🍃", reward: "+ 一阵风", toastTitle: "风经过" },
  ],
  spa: [
    { x: 30, y: 35, emoji: "☁️", reward: "+ 一团雾气", toastTitle: "雾气 +1" },
    { x: 70, y: 32, emoji: "🕯️", reward: "+ 蜡烛点亮", toastTitle: "烛光亮起" },
    { x: 50, y: 68, emoji: "✦", reward: "+ 放松一点", toastTitle: "肩膀松了" },
  ],
  temple: [
    { x: 28, y: 30, emoji: "🏮", reward: "+ 灯笼点亮", toastTitle: "灯笼 ×1" },
    { x: 72, y: 30, emoji: "🏮", reward: "+ 又一盏", toastTitle: "灯笼 ×2" },
    { x: 50, y: 70, emoji: "🔔", reward: "+ 一声钟", toastTitle: "钟声响起" },
  ],
  river: [
    { x: 25, y: 55, emoji: "⛵", reward: "+ 船只靠近", toastTitle: "船靠岸" },
    { x: 70, y: 50, emoji: "💧", reward: "+ 涟漪一圈", toastTitle: "水波荡开" },
    { x: 50, y: 30, emoji: "🐦", reward: "+ 海鸥一只", toastTitle: "海鸥飞过" },
  ],
  street: [
    { x: 28, y: 32, emoji: "🏮", reward: "+ 灯笼点亮", toastTitle: "灯笼亮起" },
    { x: 72, y: 30, emoji: "✦", reward: "+ 招牌亮了", toastTitle: "招牌点亮" },
    { x: 50, y: 68, emoji: "🛵", reward: "+ 一辆经过", toastTitle: "市井 +1" },
  ],
  shop: [
    { x: 30, y: 32, emoji: "🛍️", reward: "+ 一只袋子", toastTitle: "战利品 +1" },
    { x: 70, y: 32, emoji: "✦", reward: "+ 橱窗灯亮", toastTitle: "灯亮了" },
    { x: 50, y: 68, emoji: "🎁", reward: "+ 给自己的", toastTitle: "礼物 +1" },
  ],
  default: [
    { x: 30, y: 30, emoji: "✦", reward: "+ 一点星光", toastTitle: "星光 +1" },
    { x: 70, y: 32, emoji: "✦", reward: "+ 又一点", toastTitle: "星光 +2" },
    { x: 50, y: 68, emoji: "✿", reward: "+ 这里值得", toastTitle: "记住了" },
  ],
};

function SceneHero({
  kind, heroBg, sceneOrder, onClose, done, sceneNo,
}: {
  kind: string;
  heroBg: string;
  sceneOrder: number;
  onClose: () => void;
  done: boolean;
  sceneNo: number;
}) {
  const hotspots = HOTSPOT_MAP[kind] || HOTSPOT_MAP.default;
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [flash, setFlash] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    setCollected(new Set());
    setFloats([]);
    setBursts([]);
    setFlash(false);
  }, [sceneOrder]);

  function handleHotspot(i: number, h: Hotspot) {
    if (collected.has(i)) return;
    const next = new Set(collected);
    next.add(i);
    setCollected(next);

    const fid = ++idRef.current;
    setFloats((f) => [...f, { id: fid, x: h.x, y: h.y, text: h.reward }]);
    setBursts((b) => [...b, { id: fid, x: h.x, y: h.y }]);
    setTimeout(() => {
      setFloats((f) => f.filter((x) => x.id !== fid));
      setBursts((b) => b.filter((x) => x.id !== fid));
    }, 1500);

    toast(h.toastTitle, { description: h.reward });

    if (next.size === hotspots.length) {
      setTimeout(() => {
        setFlash(true);
        toast.success("场景探索完成 ✦", { description: "心情值 +1 · 可以去打卡了" });
        setTimeout(() => setFlash(false), 1100);
      }, 350);
    }
  }

  const allFound = collected.size === hotspots.length;

  return (
    <div
      className="relative h-56 flex items-center justify-center overflow-hidden select-none"
      style={{ background: heroBg }}
    >
      <div
        className="absolute"
        style={{ top: 18, right: 32, width: 36, height: 36, borderRadius: "50%",
          background: "radial-gradient(circle,#fff8e8 0%,#f5d68a 70%,transparent 100%)" }}
      />
      <svg className="absolute" style={{ top: 24, left: 24 }} width="60" height="20" viewBox="0 0 60 20">
        <ellipse cx="15" cy="12" rx="12" ry="6" fill="#fff8e8" opacity="0.7" />
        <ellipse cx="28" cy="10" rx="9" ry="5" fill="#fff8e8" opacity="0.85" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 h-12"
        style={{ background: "linear-gradient(180deg, transparent, rgba(255,253,243,0.5))" }} />
      <div className="relative" style={{ transform: "translateY(8px)" }}>
        <VenueIcon kind={kind as never} size={150} />
      </div>

      <div className="absolute inset-0">
        {hotspots.map((h, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleHotspot(i, h)}
            className={`hotspot ${collected.has(i) ? "is-collected" : ""}`}
            style={{ left: `${h.x}%`, top: `${h.y}%`, animationDelay: `${i * 0.4}s` }}
            aria-label={h.toastTitle}
          >
            {h.emoji}
          </button>
        ))}

        {bursts.map((b) => (
          <div key={`b${b.id}`} className="pixel-burst" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
            <span /><span /><span /><span /><span /><span />
          </div>
        ))}

        {floats.map((f) => (
          <div key={`f${f.id}`} className="float-reward" style={{ left: `${f.x}%`, top: `${f.y}%` }}>
            {f.text}
          </div>
        ))}

        {flash && <div className="scene-complete-flash" />}
      </div>

      <div
        className="absolute bottom-3 left-4 display text-[10px] tracking-[0.3em] px-2.5 py-1 rounded-full"
        style={{ background: "rgba(255,253,243,0.9)", color: "#3d3530" }}
      >
        探索 {collected.size}/{hotspots.length}{allFound ? " ✦" : ""}
      </div>

      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/60" />
      <button
        onClick={onClose}
        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center display text-[14px]"
        style={{ background: "rgba(255,253,243,0.85)", color: "#3d3530", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}
      >
        ✕
      </button>
      <div className="absolute top-3 left-4 scene-chip" style={{ background: "rgba(255,253,243,0.9)" }}>
        SCENE 0{sceneNo}
      </div>
      {done && (
        <div className="absolute bottom-3 right-4 cn-serif text-[11px] px-2.5 py-1 rounded-full"
          style={{ background: "linear-gradient(160deg,#f5b8c4,#e8c97a)", color: "#3d3530" }}>
          ✓ 已打卡
        </div>
      )}
    </div>
  );
}

/* ============ Check-in panel: note + photos + mood + rating + companion ============ */

const MOODS = ["✨", "🌿", "☕", "🌊", "🌸", "🔥", "🌙", "🍃"];
const COMPANIONS = ["独自", "朋友", "恋人", "家人", "同事", "宠物"];
const NOTE_MAX = 240;
const PHOTO_MAX = 3;

async function fileToCompressedDataUrl(file: File, maxDim = 900, quality = 0.78): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("image decode failed"));
    i.src = dataUrl;
  });
  let { width: w, height: h } = img;
  if (w > maxDim || h > maxDim) {
    const r = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * r); h = Math.round(h * r);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

function initialPhotos(record?: SceneRecord): string[] {
  if (record?.photos?.length) return record.photos.slice(0, PHOTO_MAX);
  if (record?.photo) return [record.photo];
  return [];
}

function CheckInPanel({
  sceneOrder, done, record, onUpdated,
}: {
  sceneOrder: number;
  done: boolean;
  record?: SceneRecord;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(record?.note ?? "");
  const [photos, setPhotos] = useState<string[]>(initialPhotos(record));
  const [mood, setMood] = useState<string | undefined>(record?.mood);
  const [rating, setRating] = useState<number>(record?.rating ?? 0);
  const [companion, setCompanion] = useState<string | undefined>(record?.companion);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset state when switching scenes
  useEffect(() => {
    setNote(record?.note ?? "");
    setPhotos(initialPhotos(record));
    setMood(record?.mood);
    setRating(record?.rating ?? 0);
    setCompanion(record?.companion);
    setEditing(false);
  }, [sceneOrder, done, record?.note, record?.photo, record?.mood, record?.rating, record?.companion, record?.photos]);

  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true);
    try {
      const slots = PHOTO_MAX - photos.length;
      const picked = files.slice(0, slots);
      const urls = await Promise.all(picked.map((f) => fileToCompressedDataUrl(f)));
      setPhotos((p) => [...p, ...urls].slice(0, PHOTO_MAX));
      if (files.length > slots) {
        toast(`最多 ${PHOTO_MAX} 张哦`, { description: "已保留前几张" });
      }
    } catch (err) {
      console.error(err);
      toast.error("照片读不出来，换一张试试？");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removePhotoAt(i: number) {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
  }

  function save() {
    recordScene(sceneOrder, {
      note: note.trim() || undefined,
      photo: photos[0],            // 兼容旧字段
      photos: photos.length ? photos : undefined,
      mood,
      rating: rating || undefined,
      companion,
    });
    toast.success(done ? "已更新这条记录 ✦" : "打卡完成 ✦", {
      description: note ? `「${note.slice(0, 24)}${note.length > 24 ? "…" : ""}」` : undefined,
    });
    setEditing(false);
    onUpdated();
  }

  function undo() {
    clearSceneRecord(sceneOrder);
    setNote(""); setPhotos([]); setMood(undefined); setRating(0); setCompanion(undefined);
    setEditing(true);
    onUpdated();
    toast("已取消打卡");
  }

  // ============ Quick check-in view (not done, not editing) ============
  if (!done && !editing) {
    return (
      <div
        className="mt-6 rounded-2xl border p-5 fade-up text-center"
        style={{ background: "linear-gradient(160deg,#fffdf6 0%,#fdf3ea 100%)", borderColor: "#f0e1c8" }}
      >
        <div className="cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)] mb-3">
          CHECK IN · 来过这里
        </div>
        <button
          onClick={save}
          disabled={busy}
          className="btn-soft w-full justify-center"
        >
          完成打卡 ✦
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="cn-serif text-[12px] text-[var(--ink-soft)] mt-3 underline-offset-4 hover:underline"
        >
          顺便记录一下 · 心情 / 随笔 / 照片 ↓
        </button>
      </div>
    );
  }

  // ============ Recap view (done & not editing) ============
  if (done && !editing) {
    return (
      <div className="mt-6 rounded-2xl border p-4 fade-up"
        style={{ background: "linear-gradient(160deg,#fff8e8 0%,#fdf0f5 100%)", borderColor: "#f0e1c8" }}>
        <div className="flex items-center justify-between">
          <div className="cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)]">
            MY RECORD · 打卡回顾
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(true)} className="cn-serif text-[12px] text-[var(--ink-soft)] underline-offset-4 hover:underline">
              编辑
            </button>
            <button onClick={undo} className="cn-serif text-[12px] text-[var(--ink-soft)] underline-offset-4 hover:underline">
              取消打卡
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
          {mood && <div className="text-[28px] leading-none">{mood}</div>}
          {rating > 0 && (
            <div className="display text-[13px] text-[oklch(0.72_0.15_60)] tracking-[0.1em]">
              {"★".repeat(rating)}<span className="opacity-25">{"★".repeat(5 - rating)}</span>
            </div>
          )}
          {companion && (
            <span className="cn-serif text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#fdf0d6", color: "#7a5a30" }}>
              与{companion}
            </span>
          )}
        </div>

        {photos.length > 0 && (
          <div className={`mt-3 grid gap-2 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
            {photos.map((p, i) => (
              <div key={i} className="overflow-hidden rounded-xl" style={{ boxShadow: "0 8px 24px -12px rgba(80,60,40,0.35)" }}>
                <img src={p} alt={`打卡照片 ${i + 1}`} className={`block w-full ${photos.length === 1 ? "h-auto" : "h-24 object-cover"}`} />
              </div>
            ))}
          </div>
        )}

        {note ? (
          <p className="cn-serif text-[14px] leading-[1.85] text-[var(--ink)] mt-3 whitespace-pre-wrap">
            {note}
          </p>
        ) : !photos.length && !mood && !rating && !companion ? (
          <p className="cn-serif text-[13px] text-[var(--ink-soft)] mt-2 italic">
            只是来过一下，没留下什么。
          </p>
        ) : null}

        <div className="cn-serif text-[10px] text-[var(--ink-soft)] mt-3 display tracking-[0.25em]">
          {record?.completedAt ? new Date(record.completedAt).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }) : ""}
        </div>
      </div>
    );
  }

  // ============ Edit view ============
  return (
    <div className="mt-6 rounded-2xl border p-4"
      style={{ background: "linear-gradient(160deg,#fffdf6 0%,#fdf3ea 100%)", borderColor: "#f0e1c8" }}>
      <div className="cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)] mb-3">
        {done ? "EDIT · 修改打卡" : "CHECK IN · 记录这一刻"}
      </div>

      {/* Rating */}
      <div className="cn-serif text-[11px] text-[var(--ink-soft)] mb-1.5">值得几颗星</div>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(rating === n ? 0 : n)}
            className="text-[26px] leading-none transition-transform hover:scale-110"
            style={{ color: n <= rating ? "oklch(0.78 0.17 65)" : "#dccdb4" }}
            aria-label={`${n} 星`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Mood */}
      <div className="cn-serif text-[11px] text-[var(--ink-soft)] mb-1.5">心情</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMood(mood === m ? undefined : m)}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-[18px] transition ${
              mood === m
                ? "bg-[var(--card)] ring-2 ring-[oklch(0.85_0.1_60)] scale-110"
                : "bg-white/70 hover:bg-white"
            }`}
            style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Companion */}
      <div className="cn-serif text-[11px] text-[var(--ink-soft)] mb-1.5">和谁一起</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {COMPANIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCompanion(companion === c ? undefined : c)}
            className={`cn-serif text-[12px] px-3 py-1.5 rounded-full transition ${
              companion === c
                ? "bg-[oklch(0.92_0.08_60)] text-[var(--ink)] ring-1 ring-[oklch(0.78_0.12_60)]"
                : "bg-white/70 text-[var(--ink-soft)] hover:bg-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Note */}
      <div className="cn-serif text-[11px] text-[var(--ink-soft)] mb-1.5 flex justify-between">
        <span>随笔</span>
        <span className="display tracking-[0.2em] text-[10px]">{note.length}/{NOTE_MAX}</span>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
        placeholder="此刻看到的、闻到的、想到的……写一句也好。"
        rows={3}
        className="w-full px-3 py-2.5 rounded-xl bg-white/80 border cn-serif text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] resize-none focus:bg-white"
        style={{ borderColor: "#e8dcc4" }}
      />

      {/* Photos (multi) */}
      <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-3 mb-1.5 flex justify-between">
        <span>照片</span>
        <span className="display tracking-[0.2em] text-[10px]">{photos.length}/{PHOTO_MAX}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-xl" style={{ boxShadow: "0 6px 18px -10px rgba(80,60,40,0.35)" }}>
            <img src={p} alt={`预览 ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhotoAt(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-[11px] bg-black/55 text-white"
              aria-label="移除照片"
            >
              ✕
            </button>
          </div>
        ))}
        {photos.length < PHOTO_MAX && (
          <label
            className={`aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed cursor-pointer transition ${busy ? "opacity-60" : "hover:bg-white/60"}`}
            style={{ borderColor: "#e0cfb0", background: "rgba(255,255,255,0.5)" }}
          >
            <span className="text-[20px]">📷</span>
            <span className="cn-serif text-[11px] text-[var(--ink-soft)] text-center px-1">
              {busy ? "处理中…" : "加一张"}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={handlePhoto}
            />
          </label>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={() => setEditing(false)} className="btn-ghost flex-1 justify-center">
          {done ? "取消" : "← 返回"}
        </button>
        <button onClick={save} disabled={busy} className="btn-soft flex-1 justify-center">
          {done ? "保存修改 ✦" : "完成打卡 ✦"}
        </button>
      </div>
    </div>
  );
}

/* ============ Scene buzz: 实景画廊 + AI 生成的食客短评 ============ */

type SceneReview = { name: string; rating: number; tag: string; text: string };

const BUZZ_CACHE_KEY = "todaypersona.scene_buzz_v1";

function readBuzzCache(): Record<string, SceneReview[]> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(BUZZ_CACHE_KEY) || "{}"); } catch { return {}; }
}
function writeBuzzCache(map: Record<string, SceneReview[]>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(BUZZ_CACHE_KEY, JSON.stringify(map)); } catch { /* quota */ }
}

function SceneBuzz({
  sceneName, locationName, locationType, kind, city,
}: {
  sceneName: string;
  locationName: string;
  locationType: string;
  kind: string;
  city?: string;
}) {
  const photos = useMemo(() => getVenuePhotos(kind), [kind]);
  const cacheKey = `${locationName}|${sceneName}`;
  const [reviews, setReviews] = useState<SceneReview[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cache = readBuzzCache();
    if (cache[cacheKey]?.length) {
      setReviews(cache[cacheKey]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/public/scene-buzz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scene_name: sceneName,
        location_name: locationName,
        location_type: locationType,
        city,
      }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((j: { reviews?: SceneReview[] }) => {
        if (cancelled) return;
        const list = (j.reviews ?? []).filter((r) => r?.text);
        setReviews(list);
        if (list.length) {
          const next = { ...readBuzzCache(), [cacheKey]: list };
          writeBuzzCache(next);
        }
      })
      .catch(() => { if (!cancelled) setReviews([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cacheKey, sceneName, locationName, locationType, city]);

  return (
    <div className="mt-5">
      {/* 实景画廊 */}
      <div className="flex items-center justify-between mb-2">
        <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
          实景一瞥 · GLIMPSE
        </div>
        <div className="cn-serif text-[10px] text-[var(--ink-soft)] opacity-70">
          参考实景，非该店实拍
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 snap-x snap-mandatory">
        {photos.map((src, i) => (
          <div
            key={i}
            className="relative shrink-0 rounded-2xl overflow-hidden snap-start"
            style={{ width: 168, height: 124, boxShadow: "0 8px 22px -14px rgba(60,50,40,0.45)" }}
          >
            <img
              src={src}
              alt={`${locationName} 参考实景 ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }}
            />
          </div>
        ))}
      </div>

      {/* 食客说 */}
      <div className="mt-4 flex items-center justify-between mb-2">
        <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
          大家说 · WORD OF MOUTH
        </div>
        {reviews && reviews.length > 0 && (
          <div className="cn-serif text-[11px] text-[var(--ink-soft)]">
            {(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)} ★
          </div>
        )}
      </div>

      {loading && !reviews && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/60 animate-pulse" />
          ))}
        </div>
      )}

      {reviews && reviews.length === 0 && !loading && (
        <div className="cn-serif text-[12px] text-[var(--ink-soft)] italic">
          暂时没有声音，去成为第一个留言的人。
        </div>
      )}

      <div className="space-y-2">
        {reviews?.map((r, i) => (
          <div
            key={i}
            className="rounded-xl p-3 border bg-white/70"
            style={{ borderColor: "#ece1c8" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center cn-serif text-[12px]"
                  style={{
                    background: `linear-gradient(135deg, hsl(${(i * 97) % 360} 55% 80%), hsl(${(i * 97 + 60) % 360} 55% 70%))`,
                    color: "#3d3530",
                  }}
                >
                  {r.name?.slice(-1) || "?"}
                </div>
                <div className="cn-serif text-[13px] text-[var(--ink)]">{r.name}</div>
                <span
                  className="cn-serif text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: "#fdf0d6", color: "#7a5a30" }}
                >
                  {r.tag}
                </span>
              </div>
              <div className="display text-[11px] text-[oklch(0.72_0.15_60)]">
                {"★".repeat(Math.max(1, Math.min(5, r.rating || 5)))}
              </div>
            </div>
            <p className="cn-serif text-[13px] leading-[1.7] text-[var(--ink)] mt-1.5">
              {r.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ AppealHook: 第一眼吸引 —— 实景大图 + 卖点 hook ============ */

const APPEAL_PRESETS: Record<string, { hook: string; tags: string[] }> = {
  cafe:       { hook: "光线、慢拍、一杯能坐很久的咖啡",   tags: ["手冲单品", "靠窗位",   "可久坐"] },
  bakery:     { hook: "出炉那一刻，整条街都是麦香",       tags: ["现烤可颂",   "天然酵母", "外带方便"] },
  dessert:    { hook: "为这一口糖分专程而来",             tags: ["招牌限定",   "适合拍照", "下午茶位"] },
  noodle:     { hook: "一碗热汤把今天烫平",               tags: ["现熬高汤",   "本地老味",   "排队也值"] },
  restaurant: { hook: "一顿正经饭，把心慢慢沉下来",       tags: ["主厨推荐",   "适合两人",   "氛围加分"] },
  bar:        { hook: "灯一暗，世界就变小了",             tags: ["招牌特调", "live 现场", "适合夜聊"] },
  market:     { hook: "新鲜、烟火气、活着的声音",         tags: ["当季食材", "本地小贩", "随手就买"] },
  bookstore:  { hook: "一本书的距离，世界安静下来",       tags: ["独立选书", "可阅读区", "周末有讲座"] },
  gallery:    { hook: "在一幅画前停三分钟",               tags: ["小型展览", "免费观展", "拍照友好"] },
  museum:     { hook: "把今天放进更长的时间里",           tags: ["镇馆之宝", "讲解动线", "适合放空"] },
  cinema:     { hook: "灯一灭，故事就开始了",             tags: ["IMAX 厅",   "靠后排位",   "饮料自由"] },
  flower:     { hook: "捧一束回家，今天就温柔一点",       tags: ["当季花束", "可定制",     "小束起订"] },
  plant:      { hook: "看一会儿绿色，眼睛就松了",         tags: ["稀有品种", "新手友好", "可托养"] },
  park:       { hook: "脚踩在草上，时间就慢了",           tags: ["大片草坪", "适合发呆", "傍晚最美"] },
  spa:        { hook: "把肩膀和今天，都放下来",           tags: ["招牌项目", "环境安静", "可预约"] },
  temple:     { hook: "走进去，喧嚣自己就退后了",         tags: ["香火清净", "建筑细节", "免费入院"] },
  river:      { hook: "看水流过，心事也跟着走一段",       tags: ["开阔视野", "拍照点位", "傍晚风好"] },
  street:     { hook: "走一段路，把这座城闻一遍",         tags: ["市井烟火", "随手好拍", "适合慢逛"] },
  shop:       { hook: "为自己挑一件小礼物",               tags: ["小众设计", "性价比高", "限定款"] },
  default:    { hook: "来过这里的人，都说值得",           tags: ["氛围加分", "适合此刻", "拍照好看"] },
};

function AppealHook({
  kind, sceneName, narrative, emotionTags, stayMinutes,
}: {
  kind: string;
  sceneName: string;
  narrative: string;
  emotionTags?: string[];
  stayMinutes?: number;
}) {
  const photos = useMemo(() => getVenuePhotos(kind), [kind]);
  const preset = APPEAL_PRESETS[kind] || APPEAL_PRESETS.default;

  const chips = useMemo(() => {
    const fromScene = (emotionTags ?? []).slice(0, 2);
    const fromPreset = preset.tags.filter((t) => !fromScene.includes(t));
    return [...fromScene, ...fromPreset].slice(0, 3);
  }, [emotionTags, preset.tags]);

  const hook = useMemo(() => {
    const first = (narrative || "").split(/[。！？\n]/)[0]?.trim();
    if (first && first.length >= 8 && first.length <= 36) return first;
    return preset.hook;
  }, [narrative, preset.hook]);

  const cover = photos[0];
  const more = photos.slice(1, 3);

  return (
    <div className="mt-4 -mx-6">
      <div className="relative overflow-hidden" style={{ height: 180 }}>
        {cover ? (
          <img
            src={cover}
            alt={`${sceneName} 参考实景`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#f3e6d2,#e8c2a0)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,15,10,0.05) 0%, rgba(20,15,10,0.55) 75%, rgba(20,15,10,0.78) 100%)" }} />

        <div
          className="absolute top-3 right-4 cn-serif text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,253,243,0.85)", color: "#5a4a3a" }}
        >
          参考实景
        </div>

        {more.length > 0 && (
          <div className="absolute top-12 right-4 flex flex-col gap-1.5">
            {more.map((src, i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-lg overflow-hidden"
                style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.25)", outline: "2px solid rgba(255,253,243,0.85)" }}
              >
                <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        )}

        <div className="absolute left-5 right-5 bottom-3">
          <div className="display text-[10px] tracking-[0.35em] mb-1" style={{ color: "rgba(255,253,243,0.8)" }}>
            WHY HERE · 为什么来这里
          </div>
          <p className="cn-serif text-[15px] leading-snug" style={{ color: "#fffdf3", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
            {hook}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {chips.map((t) => (
              <span
                key={t}
                className="cn-serif text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,253,243,0.92)", color: "#3d3530" }}
              >
                ✦ {t}
              </span>
            ))}
            {stayMinutes ? (
              <span
                className="cn-serif text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(0,0,0,0.35)", color: "#fffdf3", backdropFilter: "blur(4px)" }}
              >
                建议停留 ~{stayMinutes}min
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


