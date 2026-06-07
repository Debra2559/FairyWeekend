import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { PERSONA_CARDS, drawCard, RARITY_LABEL, preloadAllCovers } from "@/lib/cards";
import { savePendingCard } from "@/lib/persona-store";
import type { PersonaCard } from "@/lib/persona-types";
import { AgentChatView } from "@/components/AgentChatView";
import { OnboardingTour } from "@/components/OnboardingTour";
import { GroupModeSelector } from "@/components/GroupModeSelector";
import { getUserPhoto, subscribeUserPhoto } from "@/lib/user-photo";

export const Route = createFileRoute("/")({ component: Index });

type Mode = "agent" | "spread" | "tarot";

function Index() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("agent");
  const [selected, setSelected] = useState<PersonaCard | null>(null);
  const [tarotRevealed, setTarotRevealed] = useState<PersonaCard | null>(null);
  const [shuffleNonce, setShuffleNonce] = useState(0);

  // 进入首页即在后台预加载所有人设卡封面，切换到「我自己选」/「让命运决定」时图就在缓存里
  useEffect(() => {
    preloadAllCovers();
  }, []);


  // 浮动花瓣
  const petals = useMemo(
    () => Array.from({ length: 14 }).map((_, i) => ({
      i,
      left: Math.random() * 100,
      dx: (Math.random() - 0.5) * 200,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 4,
      size: 8 + Math.random() * 10,
    })),
    [],
  );

  function handleAccept(card: PersonaCard) {
    savePendingCard(card);
    navigate({ to: "/card" });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden px-5 pt-10 pb-20 max-w-6xl mx-auto">
      <OnboardingTour />
      {/* 背景花瓣 */}
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

      {/* Header */}
      <header className="text-center mb-6 relative z-10 fade-up">
        <div className="flex items-center justify-between mb-3">
          <div className="display text-xs tracking-[0.4em] text-[var(--ink-soft)]">
            TODAYPERSONA · v0.1
          </div>
          <button
            onClick={() => navigate({ to: "/me" })}
            className="display text-[10px] tracking-[0.3em] text-[var(--ink)] opacity-70 hover:opacity-100 border border-[var(--border)] rounded-full px-3 py-1"
          >
            我的连载 ❦
          </button>
        </div>
        <h1 className="display text-5xl md:text-6xl text-[var(--ink)] leading-[1.05]">
          今日<span className="italic">人设</span>
        </h1>
        <p className="cn-serif mt-4 text-[15px] text-[var(--ink-soft)] leading-relaxed">
          今天想成为谁？<br className="hidden sm:block" />
          是<span className="italic text-[var(--ink)]">深夜买醉的诗人</span>、<span className="italic text-[var(--ink)]">周末发呆的猫</span>，还是<span className="italic text-[var(--ink)]">迷路也开心的旅人</span>——
        </p>
        <p className="cn-serif mt-2 text-[14px] text-[var(--ink-soft)]">
          抽一张最像今天的你的卡，AI 顺着这个人设，为你写一条今天就能走的城市路线。
        </p>
      </header>

      <GroupModeSelector className="mb-6" />




      {/* Mode switch */}
      <div className="relative z-10 flex justify-center mb-8">
        <div className="inline-flex rounded-full bg-[var(--muted)] border border-[var(--border)] p-1 text-[13px] cn-serif flex-wrap gap-1">
          <button
            onClick={() => setMode("agent")}
            className={`px-4 sm:px-5 py-2 rounded-full transition ${mode === "agent" ? "bg-[var(--card)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-soft)]"}`}
          >
            AI 帮我挑 ❦
          </button>
          <button
            onClick={() => { setMode("spread"); setSelected(null); }}
            className={`px-4 sm:px-5 py-2 rounded-full transition ${mode === "spread" ? "bg-[var(--card)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-soft)]"}`}
          >
            我自己选
          </button>
          <button
            onClick={() => { setMode("tarot"); setTarotRevealed(null); setShuffleNonce((n) => n + 1); }}
            className={`px-4 sm:px-5 py-2 rounded-full transition ${mode === "tarot" ? "bg-[var(--card)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-soft)]"}`}
          >
            让命运决定 ✶
          </button>
        </div>
      </div>

      {mode === "agent" ? (
        <AgentChatView onAccept={handleAccept} />
      ) : mode === "spread" ? (
        <SpreadView
          selected={selected}
          onSelect={setSelected}
          onAccept={handleAccept}
        />
      ) : (
        <TarotView
          revealed={tarotRevealed}
          shuffleNonce={shuffleNonce}
          onDraw={() => setTarotRevealed(drawCard())}
          onAccept={handleAccept}
          onReset={() => setTarotRevealed(null)}
        />
      )}




      <footer className="mt-16 text-center text-[11px] tracking-[0.3em] text-[var(--ink-soft)] display relative z-10">
        © 2026 · MEITUAN HACKATHON
      </footer>
    </div>
  );
}

/* -------- 自选模式：网格展开所有卡 -------- */
function SpreadView({
  selected, onSelect, onAccept,
}: {
  selected: PersonaCard | null;
  onSelect: (c: PersonaCard) => void;
  onAccept: (c: PersonaCard) => void;
}) {
  return (
    <section className="relative z-10">
      <p className="text-center cn-serif text-[13px] text-[var(--ink-soft)] mb-6">
        今天你想成为谁？点一张卡看看
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {PERSONA_CARDS.map((card, idx) => {
          const isSel = selected?.id === card.id;
          return (
            <button
              key={card.id}
              onClick={() => onSelect(card)}
              className={`group relative text-left rounded-2xl overflow-hidden border bg-[var(--card)] transition-all duration-300 fade-up ${
                isSel
                  ? "border-[var(--accent)] shadow-[0_18px_50px_-20px_rgba(0,0,0,0.25)] -translate-y-1"
                  : "border-[var(--border)] hover:-translate-y-1 hover:shadow-[0_14px_36px_-20px_rgba(0,0,0,0.2)]"
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <MiniCardFront card={card} />
            </button>
          );
        })}
      </div>

      {/* 给底部预留出确认条的高度，避免覆盖最后一行卡片 */}
      <div aria-hidden className={selected ? "h-28" : "h-0"} />

      {/* 选中后的确认条：固定在视口底部 */}
      <div
        className={`fixed left-0 right-0 bottom-4 z-40 px-4 transition-all duration-500 ${
          selected ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
        }`}
      >
        {selected && (
          <div className="mx-auto max-w-2xl rounded-2xl bg-[var(--card)]/95 backdrop-blur border border-[var(--border)] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)] p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl shrink-0"
              style={{
                background: `linear-gradient(135deg, ${selected.colors[0]} 0%, ${selected.colors[1]} 100%)`,
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="cn-serif text-[11px] tracking-[0.2em] text-[var(--ink-soft)]">
                你选择了 · {RARITY_LABEL[selected.rarity]}
              </div>
              <div className="cn-serif text-[15px] text-[var(--ink)] truncate">
                {selected.identity}
              </div>
            </div>
            <button onClick={() => onAccept(selected)} className="btn-soft shrink-0">
              就是它 →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function MiniCardFront({ card }: { card: PersonaCard }) {
  const [a, b, c] = card.colors;
  return (
    <div className="persona-card h-full" data-rarity={card.rarity}>
      <div
        className="relative h-44 sm:h-52 overflow-hidden"
        style={
          card.cover
            ? undefined
            : { background: `linear-gradient(160deg, ${a} 0%, ${b} 100%)` }
        }
      >
        {card.cover ? (
          <img
            src={card.cover}
            alt={card.identity}
            className="absolute inset-0 w-full h-full object-cover"
            decoding="async"
          />


        ) : (
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                `radial-gradient(circle at 25% 30%, ${c} 0%, transparent 45%), radial-gradient(circle at 75% 70%, ${a} 0%, transparent 50%)`,
            }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        <div className="absolute top-2 left-2 rarity-chip" data-rarity={card.rarity}>
          ✦ {card.rarity}
        </div>
      </div>
      <div className="p-3.5">
        <div className="cn-serif text-[10px] tracking-[0.22em] text-[var(--ink-soft)]">
          IDENTITY
        </div>
        <h3 className="cn-serif text-[14px] leading-snug text-[var(--ink)] mt-1 line-clamp-2 min-h-[2.6em]">
          {card.identity}
        </h3>
        <div className="mt-2 cn-serif text-[12px] text-[var(--ink-soft)] italic line-clamp-2">
          「{card.mission}」
        </div>
      </div>
    </div>
  );
}

/* -------- 塔罗模式：扇形展开 + 在位翻牌 -------- */
function TarotView({
  revealed, shuffleNonce = 0, onDraw, onAccept, onReset,
}: {
  revealed: PersonaCard | null;
  shuffleNonce?: number;
  onDraw: () => void;
  onAccept: (c: PersonaCard) => void;
  onReset: () => void;
}) {
  // 响应式：在手机端缩小整套牌阵参数
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 390,
  );
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 844,
  );
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );
  useEffect(() => {
    const onR = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const CARD_COUNT = 22;
  const SPREAD = isMobile ? 78 : 96;     // 总角度
  const RADIUS = isMobile ? 240 : 440;   // 弧半径
  const CARD_W = isMobile ? 68 : 108;
  const CARD_H = isMobile ? 104 : 168;
  const FAN_W = isMobile ? 340 : 860;
  const FAN_H = isMobile ? 230 : 360;
  const EXPANDED_H = isMobile ? Math.max(420, viewportHeight - 240) : 560;
  const PIVOT_Y = FAN_H + RADIUS - (isMobile ? 60 : 90);

  const [order, setOrder] = useState(() => Array.from({ length: CARD_COUNT }, (_, i) => i));
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [dragShift, setDragShift] = useState(0);
  const [shuffling, setShuffling] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const movedRef = useRef(false);
  const drewRef = useRef(false);

  function reshuffle() {
    if (shuffling || picked !== null) return;
    setHover(null);
    setShuffling(true);
    setTimeout(() => setOrder((arr) => [...arr].sort(() => Math.random() - 0.5)), 380);
    setTimeout(() => setShuffling(false), 760);
  }

  // 切到"让命运决定"或再次点击该 tab 时，自动播一次洗牌动画
  useEffect(() => {
    setHover(null);
    setShuffling(true);
    const t1 = setTimeout(() => setOrder((arr) => [...arr].sort(() => Math.random() - 0.5)), 380);
    const t2 = setTimeout(() => setShuffling(false), 820);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffleNonce]);


  function pointerToIndex(clientX: number, clientY: number) {
    const el = fanRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + PIVOT_Y;
    const dx = clientX - cx;
    const dy = cy - clientY;
    if (dy <= 0) return null;
    const angleDeg = (Math.atan2(dx, dy) * 180) / Math.PI - dragShift;
    const t = (angleDeg + SPREAD / 2) / SPREAD;
    if (t < -0.08 || t > 1.08) return null;
    return Math.max(0, Math.min(CARD_COUNT - 1, Math.round(t * (CARD_COUNT - 1))));
  }

  function onPointerDown(e: React.PointerEvent) {
    if (picked !== null || shuffling) return;
    dragStartX.current = e.clientX;
    movedRef.current = false;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (picked !== null || shuffling) return;
    const idx = pointerToIndex(e.clientX, e.clientY);
    if (idx !== null) setHover(idx);
    if (dragStartX.current !== null) {
      const dx = e.clientX - dragStartX.current;
      if (Math.abs(dx) > 4) movedRef.current = true;
      setDragShift(Math.max(-9, Math.min(9, dx * 0.04)));
    }
  }
  function onPointerUp() {
    const wasDrag = movedRef.current;
    const shift = dragShift;
    dragStartX.current = null;
    setDragShift(0);
    if (wasDrag && Math.abs(shift) > 2) {
      setOrder((arr) => {
        const a = [...arr];
        if (shift > 0) a.push(a.shift()!); else a.unshift(a.pop()!);
        return a;
      });
    }
  }
  function onPointerLeave() {
    setHover(null);
    setDragShift(0);
    dragStartX.current = null;
  }

  function handlePick(visualIdx: number) {
    if (picked !== null || shuffling || movedRef.current) return;
    setHover(null);
    setPicked(visualIdx);
    drewRef.current = false;
    if (isMobile) {
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    // 1. 飞到中心
    // 2. 调用 onDraw 让父层准备 revealed 数据
    setTimeout(() => {
      if (!drewRef.current) { onDraw(); drewRef.current = true; }
    }, 650);
    // 3. 翻面
    setTimeout(() => setFlipped(true), 780);
  }

  useEffect(() => {
    if (!revealed) {
      setPicked(null);
      setFlipped(false);
      drewRef.current = false;
    }
  }, [revealed]);

  const showActions = picked === null;

  return (
    <section ref={sectionRef} className="relative z-10 flex flex-col items-center">
      <p className="text-center cn-serif text-[13px] text-[var(--ink-soft)] mb-6 max-w-md">
        {picked === null
          ? "说不清想成为谁？把手放上去，拨开牌阵，挑一张属于今天的牌。"
          : flipped
            ? "命运为你翻开了这张牌 ✦"
            : "牌正在翻开……"}
      </p>

      <div
        ref={fanRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        className="relative select-none touch-none mx-auto"
        style={{
          width: FAN_W,
          height: picked !== null ? EXPANDED_H : FAN_H,
          maxWidth: "100%",
          perspective: 1600,
          transition: "height 0.6s cubic-bezier(.22,1,.36,1)",
        }}
      >
        {order.map((cardId, i) => {

          const t = i / (CARD_COUNT - 1);
          const angle = -SPREAD / 2 + SPREAD * t + dragShift;
          const isHover = hover === i && picked === null && !shuffling;
          const isPicked = picked === i;
          const isOther = picked !== null && !isPicked;

          const rad = (angle * Math.PI) / 180;
          const cx = FAN_W / 2 + RADIUS * Math.sin(rad);
          const cy = PIVOT_Y - RADIUS * Math.cos(rad);

          const dist = hover === null ? 99 : Math.abs(i - hover);
          const lift = isHover ? 52 : Math.max(0, 18 - dist * 5);

          // picked 后画布会扩大；让 picked 卡居中并按可用高度缩放
          const expandedH = EXPANDED_H;
          const maxPickedWidth = Math.min(
            FAN_W - (isMobile ? 28 : 80),
            viewportWidth - (isMobile ? 72 : 120),
            isMobile ? 292 : 360,
          );
          const maxPickedHeight = expandedH - (isMobile ? 28 : 40);
          const pickedScale = Math.min(maxPickedWidth / CARD_W, maxPickedHeight / CARD_H);
          const pickedCardWidth = CARD_W * pickedScale;
          const pickedCardHeight = CARD_H * pickedScale;

          // 洗牌：所有牌聚拢到中线，轻微角度散
          const stackTilt = ((i % 7) - 3) * 1.6;
          const slotLeft = isPicked
            ? FAN_W / 2
            : shuffling ? FAN_W / 2 : cx;
          const slotTop = isPicked
            ? expandedH / 2
            : shuffling ? FAN_H * 0.55 : cy;
          const slotRotate = isPicked
            ? 0
            : shuffling ? stackTilt : angle;

          const innerScale = isHover ? 1.06 : 1;
          const innerLift = isPicked || shuffling ? 0 : -lift;

          const innerRotateY = isPicked && flipped ? 180 : 0;

          // 错开洗牌的动效
          const transitionDelay = shuffling ? `${(i * 18) % 220}ms` : "0ms";

          return (
            <div
              key={cardId}
              onClick={() => handlePick(i)}
              className="absolute"
              style={{
                left: slotLeft,
                top: slotTop,
                width: isPicked ? pickedCardWidth : CARD_W,
                height: isPicked ? pickedCardHeight : CARD_H,
                transform: `translate(-50%, -50%) rotate(${slotRotate}deg)`,
                transition: isPicked
                  ? "left 0.7s cubic-bezier(.22,1,.36,1), top 0.7s cubic-bezier(.22,1,.36,1), width 0.7s cubic-bezier(.22,1,.36,1), height 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1)"
                  : "left 0.42s cubic-bezier(.22,1,.36,1), top 0.42s cubic-bezier(.22,1,.36,1), width 0.42s cubic-bezier(.22,1,.36,1), height 0.42s cubic-bezier(.22,1,.36,1), transform 0.42s cubic-bezier(.22,1,.36,1), opacity 0.4s",
                transitionDelay,
                zIndex: isPicked ? 120 : isHover ? 80 : i,
                opacity: isOther ? 0 : 1,
                pointerEvents: picked !== null && !isPicked ? "none" : "auto",
                cursor: picked !== null ? "default" : "pointer",
                transformStyle: "preserve-3d",
              }}
            >
              <div
                className="tarot-flip"
                style={{
                  transform: `translateY(${innerLift}px) scale(${innerScale}) rotateY(${innerRotateY}deg)`,
                  transition: isPicked
                    ? "transform 0.85s cubic-bezier(.22,1,.36,1)"
                    : "transform 0.4s cubic-bezier(.22,1,.36,1)",
                  boxShadow: isHover
                    ? "0 28px 56px -22px rgba(40,20,10,0.5)"
                    : isPicked
                      ? "0 40px 80px -28px rgba(40,20,10,0.55), 0 0 60px oklch(0.85 0.13 75 / 0.4)"
                      : "0 14px 30px -20px rgba(40,20,10,0.4)",
                }}
              >
                <div className="tarot-face tarot-back-face">
                  <div className="tarot-back-frame" />
                  <div className="tarot-back-mark">✦</div>
                  <div className="tarot-back-corner top-left">✶</div>
                  <div className="tarot-back-corner top-right">✶</div>
                  <div className="tarot-back-corner bottom-left">✶</div>
                  <div className="tarot-back-corner bottom-right">✶</div>
                </div>
                {isPicked && revealed && (
                  <div
                    className="tarot-face tarot-front-face persona-card"
                    data-rarity={revealed.rarity}
                  >
                    <FullCardFront card={revealed} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {picked === null && (
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 cn-serif text-[10px] tracking-[0.3em] text-[var(--ink-soft)]"
            style={{ bottom: 6 }}
          >
            ← 拨动牌阵 · 点击抽取 →
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-3">
        {showActions && (
          <button onClick={reshuffle} disabled={shuffling} className="btn-ghost">
            {shuffling ? "洗牌中…" : "重新洗牌 ✶"}
          </button>
        )}
        {revealed && flipped && (
          <>
            <button onClick={() => onAccept(revealed)} className="btn-soft">
              接受这个自己 →
            </button>
            <button onClick={onReset} className="btn-ghost">
              再抽一次 ✶
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function FullCardFront({ card }: { card: PersonaCard }) {
  const [a, b, c] = card.colors;
  const [userPhoto, setUserPhotoState] = useState<string | null>(null);
  useEffect(() => {
    setUserPhotoState(getUserPhoto());
    return subscribeUserPhoto(setUserPhotoState);
  }, []);
  return (
    <div className="h-full w-full flex flex-col">
      <div
        className="relative h-[58%] overflow-hidden"
        style={
          card.cover
            ? undefined
            : { background: `linear-gradient(160deg, ${a} 0%, ${b} 100%)` }
        }
      >
        {card.cover ? (
          <img src={card.cover} alt={card.identity} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                `radial-gradient(circle at 25% 30%, ${c} 0%, transparent 45%), radial-gradient(circle at 75% 70%, ${a} 0%, transparent 50%)`,
            }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 rarity-chip" data-rarity={card.rarity}>
          ✦ {card.rarity} · {RARITY_LABEL[card.rarity]}
        </div>
        <div className="absolute bottom-3 right-3 display italic text-[13px] text-white/90 drop-shadow">
          {card.id.replace("card_", "No.")}
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col">
        <div className="cn-serif text-[11px] tracking-[0.25em] text-[var(--ink-soft)]">
          IDENTITY · 身份
        </div>
        <h3 className="cn-serif text-[20px] leading-tight text-[var(--ink)] mt-1">
          {card.identity}
        </h3>
        <div className="mt-4 cn-serif text-[11px] tracking-[0.25em] text-[var(--ink-soft)]">
          MOOD · 今日状态
        </div>
        <div className="cn-serif text-[14px] text-[var(--ink)] mt-1">{card.mood}</div>
        <div className="mt-4 cn-serif text-[11px] tracking-[0.25em] text-[var(--ink-soft)]">
          MISSION · 今日使命
        </div>
        <div className="cn-serif text-[14px] text-[var(--ink)] mt-1 italic">
          「{card.mission}」
        </div>
      </div>
    </div>
  );
}
