import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Calendar, MapPin, Sparkles, X, BookMarked, Download } from "lucide-react";
import { loadSagas, hydrateSagasFromCloud, type ArchivedChapter } from "@/lib/persona-store";
import { PERSONA_CARDS } from "@/lib/cards";
import { exportSeriesStorybook } from "@/lib/series-export";
import { toast } from "sonner";

export const Route = createFileRoute("/library")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "我的连载库 · TODAYPERSONA" },
      { name: "description", content: "把你走过的每一个周末，收进一本可以翻开的连载。" },
    ],
  }),
});

// ============= utils =============

function getCover(cardId: string): string | undefined {
  const card = PERSONA_CARDS.find((c) => c.id === cardId);
  return card?.cover;
}

function firstPhoto(chapter: ArchivedChapter): string | undefined {
  const records = chapter.sceneRecords ?? {};
  for (const r of Object.values(records)) {
    if (r?.photos?.length) return r.photos[0];
    if (r?.photo) return r.photo;
  }
  return undefined;
}

function dateLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" });
}

function issueNumber(index: number, total: number): string {
  const num = total - index;
  return `NO.${String(num).padStart(3, "0")}`;
}

function rarityLabel(r: string): string {
  return ({ N: "普通", R: "稀有", SR: "史诗", SSR: "传说" } as Record<string, string>)[r] || r;
}

function rarityHue(r: string): string {
  return ({
    N: "oklch(0.72 0.04 80)",
    R: "oklch(0.70 0.10 220)",
    SR: "oklch(0.74 0.13 320)",
    SSR: "oklch(0.78 0.16 65)",
  } as Record<string, string>)[r] || "oklch(0.72 0.04 80)";
}

// ============= page =============

function LibraryPage() {
  const navigate = useNavigate();
  const [sagas, setSagas] = useState<ArchivedChapter[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<"shelf" | "magazine">("shelf");
  const [bookExporting, setBookExporting] = useState(false);

  async function handleExportAll() {
    if (bookExporting || sagas.length === 0) return;
    setBookExporting(true);
    try {
      toast("📖 正在装订你的连载故事书…", {
        description: `共 ${sagas.length} 本 · 稍等几秒钟`,
      });
      const result = await exportSeriesStorybook(sagas, "download");
      toast.success(result === "shared" ? "已分享你的连载故事书 ✦" : "📖 连载故事书已生成", {
        description: `共 ${sagas.length} 本 · 已保存到本地`,
      });
    } catch (e) {
      toast.error("生成失败", { description: (e as Error).message });
    } finally {
      setBookExporting(false);
    }
  }

  useEffect(() => {
    setSagas(loadSagas());
    hydrateSagasFromCloud().then(setSagas).catch(() => {});
  }, []);

  // 按月份分组（货架按月）
  const shelves = useMemo(() => {
    const map = new Map<string, ArchivedChapter[]>();
    for (const s of sagas) {
      const d = new Date(s.archivedAt ?? s.createdAt);
      const key = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [sagas]);

  const stats = useMemo(() => {
    const chapters = sagas.length;
    const scenes = sagas.reduce((s, c) => s + c.completedSceneOrders.length, 0);
    const photos = sagas.reduce(
      (s, c) => s + Object.values(c.sceneRecords ?? {}).reduce((n, r) => n + (r?.photos?.length ?? (r?.photo ? 1 : 0)), 0),
      0,
    );
    const cities = new Set(sagas.map((s) => s.city).filter(Boolean) as string[]).size;
    return { chapters, scenes, photos, cities };
  }, [sagas]);

  const opened = sagas.find((s) => s.chapterId === openId) ?? null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[var(--bg)]/85 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/" })}
            className="w-9 h-9 rounded-full hover:bg-[var(--muted)] flex items-center justify-center"
            aria-label="返回"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="cn-serif text-[16px] text-[var(--ink)]">连载库</h1>
          <Link
            to="/me"
            className="cn-serif text-[12px] text-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            我的 →
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        {/* 杂志报头 */}
        <div className="text-center mb-6">
          <div className="display italic text-[10px] tracking-[0.45em] text-[var(--ink-soft)] mb-2">
            TODAYPERSONA · MONTHLY
          </div>
          <h2 className="cn-serif text-[28px] text-[var(--ink)] leading-tight">
            我的<span className="italic">连载库</span>
          </h2>
          <p className="cn-serif text-[12.5px] text-[var(--ink-soft)] mt-2 max-w-md mx-auto leading-relaxed">
            每一个被你打卡过的周末，都变成一本可以翻开的小杂志。
            <br />
            收藏的不是地点，是某一天的你。
          </p>
        </div>

        {/* 总览统计 */}
        <div
          className="grid grid-cols-4 gap-2 rounded-2xl p-3 mb-5"
          style={{
            background: "linear-gradient(160deg,#fffdf6 0%,#fdf3ea 100%)",
            border: "1px solid #f0e1c8",
          }}
        >
          {[
            { label: "已出刊", value: stats.chapters, unit: "本" },
            { label: "总章节", value: stats.scenes, unit: "话" },
            { label: "留影", value: stats.photos, unit: "张" },
            { label: "城市", value: stats.cities, unit: "座" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="cn-serif text-[10px] text-[var(--ink-soft)] tracking-wider">{s.label}</div>
              <div className="cn-serif text-[20px] text-[var(--ink)] mt-0.5">
                {s.value}
                <span className="text-[10px] text-[var(--ink-soft)] ml-0.5">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 故事书装订入口已迁移至「我的 · 故事书」tab */}

        {/* 视图切换 */}
        {sagas.length > 0 && (
          <div className="flex items-center justify-center gap-1 mb-5">
            {(["shelf", "magazine"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`cn-serif text-[11px] px-3 py-1.5 rounded-full transition ${
                  view === v
                    ? "bg-[oklch(0.92_0.08_60)] text-[var(--ink)] ring-1 ring-[oklch(0.78_0.12_60)]"
                    : "bg-white/70 text-[var(--ink-soft)] hover:bg-white"
                }`}
              >
                {v === "shelf" ? "书架视图" : "杂志视图"}
              </button>
            ))}
          </div>
        )}

        {/* 空状态 */}
        {sagas.length === 0 ? (
          <EmptyState />
        ) : view === "shelf" ? (
          <ShelfView shelves={shelves} total={sagas.length} onOpen={setOpenId} />
        ) : (
          <MagazineView sagas={sagas} onOpen={setOpenId} />
        )}
      </div>

      {/* 详情抽屉 */}
      {opened && <ChapterDetail chapter={opened} onClose={() => setOpenId(null)} />}
    </div>
  );
}

// ============= empty =============

function EmptyState() {
  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{
        background: "linear-gradient(160deg,#fffdf6 0%,#fdf3ea 100%)",
        border: "1px dashed #e0c89c",
      }}
    >
      <BookOpen className="w-10 h-10 mx-auto text-[var(--ink-soft)] mb-3 opacity-60" />
      <div className="cn-serif text-[15px] text-[var(--ink)] mb-2">书架还是空的</div>
      <p className="cn-serif text-[12.5px] text-[var(--ink-soft)] leading-relaxed max-w-xs mx-auto mb-4">
        去抽一张人设卡，走完今天的路线，
        <br />
        这里就会出现你的第一本连载。
      </p>
      <Link
        to="/"
        className="cn-serif inline-block text-[12px] px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--bg)]"
      >
        ✦ 现在开始第 NO.001 本
      </Link>
    </div>
  );
}

// ============= shelf view =============

function ShelfView({
  shelves,
  total,
  onOpen,
}: {
  shelves: [string, ArchivedChapter[]][];
  total: number;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="space-y-8">
      {shelves.map(([month, items]) => (
        <div key={month}>
          <div className="flex items-baseline gap-3 mb-3 px-1">
            <div className="cn-serif text-[14px] text-[var(--ink)]">{month}</div>
            <div className="cn-serif text-[10px] tracking-wider text-[var(--ink-soft)]">
              · {items.length} 本
            </div>
          </div>
          {/* 书架 */}
          <div className="relative">
            <div className="flex items-end gap-1.5 px-1 pb-1 overflow-x-auto scrollbar-thin">
              {items.map((chapter, idx) => (
                <BookSpine
                  key={chapter.chapterId}
                  chapter={chapter}
                  issue={issueNumber(idx, total)}
                  onClick={() => onOpen(chapter.chapterId)}
                />
              ))}
            </div>
            {/* 木架底板 */}
            <div
              className="h-2 rounded-sm"
              style={{
                background: "linear-gradient(180deg,#b08960 0%,#8a6a48 100%)",
                boxShadow: "0 4px 8px -3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            />
            <div
              className="h-1 mt-px rounded-sm opacity-50"
              style={{ background: "linear-gradient(180deg,#6e5238 0%,transparent 100%)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BookSpine({
  chapter,
  issue,
  onClick,
}: {
  chapter: ArchivedChapter;
  issue: string;
  onClick: () => void;
}) {
  const { card } = chapter;
  const [c1, c2, c3] = card.colors ?? ["#d8c8a8", "#a89878", "#786850"];
  // 高度按"完成度"变化 — 完成越多书越"厚实"
  const completion = chapter.completedSceneOrders.length / Math.max(1, chapter.journey.scenes.length);
  const height = 160 + Math.round(completion * 30); // 160-190
  const width = 36 + Math.round(completion * 8); // 36-44

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative shrink-0 transition-transform hover:-translate-y-1 focus:-translate-y-1 outline-none"
      style={{ width, height }}
      aria-label={`打开 ${card.identity}`}
    >
      <div
        className="absolute inset-0 rounded-sm overflow-hidden flex flex-col items-center justify-between py-2.5 px-1"
        style={{
          background: `linear-gradient(180deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)`,
          boxShadow:
            "inset 1px 0 0 rgba(255,255,255,0.25), inset -1px 0 0 rgba(0,0,0,0.18), 0 4px 8px -4px rgba(0,0,0,0.3)",
        }}
      >
        {/* 顶端稀有度色条 */}
        <div
          className="w-full h-0.5 rounded-sm"
          style={{ background: rarityHue(card.rarity) }}
        />

        {/* 竖排书脊文字 */}
        <div
          className="cn-serif text-[10px] leading-tight text-center px-0.5 flex-1 flex items-center justify-center"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "upright",
            color: "rgba(40,28,18,0.85)",
            letterSpacing: "0.1em",
            maxHeight: height - 50,
            overflow: "hidden",
          }}
        >
          {card.identity.slice(0, 9)}
        </div>

        {/* 底部期号 */}
        <div
          className="display italic text-[7px] tracking-[0.15em] opacity-70"
          style={{ color: "rgba(40,28,18,0.7)" }}
        >
          {issue.replace("NO.", "")}
        </div>
      </div>
    </button>
  );
}

// ============= magazine view =============

function MagazineView({
  sagas,
  onOpen,
}: {
  sagas: ArchivedChapter[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {sagas.map((chapter, idx) => (
        <MagazineCover
          key={chapter.chapterId}
          chapter={chapter}
          issue={issueNumber(idx, sagas.length)}
          onClick={() => onOpen(chapter.chapterId)}
        />
      ))}
    </div>
  );
}

function MagazineCover({
  chapter,
  issue,
  onClick,
}: {
  chapter: ArchivedChapter;
  issue: string;
  onClick: () => void;
}) {
  const { card } = chapter;
  const photo = firstPhoto(chapter);
  const cover = getCover(card.id);
  const [c1, c2, c3] = card.colors ?? ["#f0e6d3", "#d4a896", "#8a6a48"];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-[3/4] rounded-md overflow-hidden text-left transition-transform hover:-translate-y-1 hover:shadow-lg outline-none"
      style={{
        background: `linear-gradient(160deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`,
        boxShadow:
          "0 6px 18px -8px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 -40px 60px -20px rgba(0,0,0,0.35)",
      }}
    >
      {/* 主图：用户照片优先，否则用卡面 */}
      {photo ? (
        <img
          src={photo}
          alt={card.identity}
          className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-90"
        />
      ) : cover ? (
        <img
          src={cover}
          alt={card.identity}
          className="absolute inset-0 w-full h-full object-cover opacity-75"
        />
      ) : null}

      {/* 暗角 + 上下渐变让文字可读 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 40%, transparent 55%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* 顶部报头 */}
      <div className="absolute top-2 left-2.5 right-2.5 flex items-center justify-between">
        <div className="display italic text-[7px] tracking-[0.3em] text-white/85">
          TODAYPERSONA
        </div>
        <div
          className="display italic text-[8px] px-1.5 py-0.5 rounded-sm"
          style={{
            background: rarityHue(card.rarity),
            color: "rgba(20,12,4,0.85)",
            letterSpacing: "0.1em",
          }}
        >
          {card.rarity}
        </div>
      </div>

      {/* 底部信息 */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 text-white">
        <div className="display italic text-[8px] tracking-[0.35em] text-white/70 mb-1">
          {issue} · {dateLabel(chapter.archivedAt ?? chapter.createdAt)}
        </div>
        <div className="cn-serif text-[13px] leading-snug line-clamp-2 drop-shadow-sm">
          {card.identity}
        </div>
        <div className="flex items-center gap-1.5 mt-1 cn-serif text-[10px] text-white/80">
          <MapPin className="w-2.5 h-2.5" />
          <span className="truncate">{chapter.city || "某座城市"}</span>
          <span className="opacity-50">·</span>
          <span>
            {chapter.completedSceneOrders.length}/{chapter.journey.scenes.length} 话
          </span>
        </div>
      </div>
    </button>
  );
}

// ============= detail drawer =============

function ChapterDetail({ chapter, onClose }: { chapter: ArchivedChapter; onClose: () => void }) {
  const { card, journey, sceneRecords = {} } = chapter;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 fade-in"
      style={{
        background: "color-mix(in oklab, var(--bg) 70%, rgba(0,0,0,0.5))",
        backdropFilter: "blur(12px)",
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-full overflow-y-auto rounded-2xl"
        style={{
          background: "linear-gradient(160deg,#fffdf6 0%,#fdf3ea 100%)",
          border: "1px solid #f0e1c8",
          boxShadow: "0 20px 50px -20px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭 */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3 bg-[#fffdf6]/90 backdrop-blur border-b border-[#f0e1c8]">
          <div className="cn-serif text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
            CHAPTER · 翻开这一期
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[var(--muted)] flex items-center justify-center text-[var(--ink-soft)]"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>



        <div className="p-5">
          {/* 期号 + 日期 */}
          <div className="flex items-center gap-2 text-[var(--ink-soft)] mb-2">
            <Calendar className="w-3 h-3" />
            <span className="cn-serif text-[11px]">
              {dateLabel(chapter.archivedAt ?? chapter.createdAt)}
            </span>
            <span className="opacity-50">·</span>
            <MapPin className="w-3 h-3" />
            <span className="cn-serif text-[11px]">{chapter.city || "某座城市"}</span>
          </div>

          {/* 身份 + 心情 */}
          <h3 className="cn-serif text-[22px] text-[var(--ink)] leading-snug">
            {card.identity}
          </h3>
          <div className="cn-serif text-[12.5px] text-[var(--ink-soft)] mt-1">
            「{card.mood}」· {card.mission}
          </div>

          {/* 故事开篇 */}
          {journey.story_opening && (
            <p className="cn-serif text-[13px] text-[var(--ink)] leading-relaxed mt-4 italic opacity-90">
              {journey.story_opening}
            </p>
          )}

          {/* 章节列表 */}
          <div className="mt-5 space-y-4">
            {journey.scenes.map((scene) => {
              const rec = sceneRecords[scene.order];
              const photos = rec?.photos?.length ? rec.photos : rec?.photo ? [rec.photo] : [];
              const done = chapter.completedSceneOrders.includes(scene.order);
              return (
                <div
                  key={scene.order}
                  className="rounded-xl p-3.5"
                  style={{
                    background: done ? "#fff" : "rgba(255,255,255,0.4)",
                    border: "1px solid #f0e1c8",
                  }}
                >
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="display italic text-[10px] tracking-[0.25em] text-[var(--ink-soft)]">
                      CH.{String(scene.order).padStart(2, "0")}
                    </span>
                    <span className="cn-serif text-[14px] text-[var(--ink)] flex-1 leading-snug">
                      {scene.scene_name}
                    </span>
                    {done && (
                      <Sparkles className="w-3 h-3 text-[oklch(0.78_0.16_65)]" />
                    )}
                  </div>
                  <div className="cn-serif text-[11.5px] text-[var(--ink-soft)] mb-2">
                    @ {scene.location_name}
                  </div>

                  {photos.length > 0 && (
                    <div className={`grid gap-1.5 mb-2 ${photos.length === 1 ? "" : "grid-cols-3"}`}>
                      {photos.map((p, i) => (
                        <img
                          key={i}
                          src={p}
                          alt={`第 ${scene.order} 话 · ${i + 1}`}
                          className={`rounded-md w-full ${photos.length === 1 ? "h-auto max-h-64 object-cover" : "h-20 object-cover"}`}
                        />
                      ))}
                    </div>
                  )}

                  {rec?.mood && (
                    <div className="text-[18px] leading-none mb-1">{rec.mood}</div>
                  )}
                  {rec?.note && (
                    <p className="cn-serif text-[12.5px] text-[var(--ink)] leading-relaxed">
                      {rec.note}
                    </p>
                  )}
                  {!done && (
                    <p className="cn-serif text-[11px] text-[var(--ink-soft)] italic">
                      （这一话未开篇）
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* 结语 */}
          {journey.closing && (
            <div
              className="mt-5 p-4 rounded-xl"
              style={{
                background: "#fff",
                border: "1px dashed #e0c89c",
              }}
            >
              <div className="display italic text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mb-1.5">
                CLOSING · 今日结语
              </div>
              <p className="cn-serif text-[12.5px] text-[var(--ink)] leading-relaxed italic">
                {journey.closing}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
