import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Camera,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Edit3,
  FileText,
  Heart,
  Image as ImageIcon,
  Stamp,
  MapPinned,
  MoreHorizontal,
  PenLine,
  Plus,
  QrCode,
  Route as RouteIcon,
  Search,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";
import {
  loadSagas,
  hydrateSagasFromCloud,
  buildLibrary,
  deleteChapter,
  type ArchivedChapter,
  type LibraryEntry,
} from "@/lib/persona-store";
import { getCoverById } from "@/lib/cards";
import { VenueIcon, detectVenue } from "@/components/VenueIcon";
import { UserPhotoCard } from "@/components/UserPhotoCard";
import { RouteOverviewMap } from "@/components/RouteOverviewMap";
import type * as ExportPdf from "@/lib/export-pdf";
const loadExportPdf = () => import("@/lib/export-pdf");
const elementToImageBlob: typeof ExportPdf.elementToImageBlob = (...args) =>
  loadExportPdf().then((m) => m.elementToImageBlob(...args));
const elementToPdfBlob: typeof ExportPdf.elementToPdfBlob = (...args) =>
  loadExportPdf().then((m) => m.elementToPdfBlob(...args));
const downloadBlob = (...args: Parameters<typeof ExportPdf.downloadBlob>): Promise<string> =>
  loadExportPdf().then((m) => m.downloadBlob(...args));
const shareImageOrDownload: typeof ExportPdf.shareImageOrDownload = (...args) =>
  loadExportPdf().then((m) => m.shareImageOrDownload(...args));
const shareOrDownload: typeof ExportPdf.shareOrDownload = (...args) =>
  loadExportPdf().then((m) => m.shareOrDownload(...args));
import {
  analyzePostchainTextRisks,
  buildPostchainReport,
  validatePostchainEditedReport,
  validatePostchainShareText,
  type PostchainContentFormat,
  type PostchainAuthLevel,
  type PostchainPrivacySettings,
  type PostchainReport,
  type PostchainReportStyle,
} from "@/lib/postchain-report";
// postchain-share / postchain-consent 只在分享/授权流程用，动态加载避免进 me.tsx 首屏 chunk
import type * as PostchainShareModule from "@/lib/postchain-share";
import type * as PostchainConsentModule from "@/lib/postchain-consent";
const loadPostchainShare = () => import("@/lib/postchain-share");
const loadPostchainConsent = () => import("@/lib/postchain-consent");
const savePublicPostchainShareCloud: typeof PostchainShareModule.savePublicPostchainShareCloud = (
  ...args
) => loadPostchainShare().then((m) => m.savePublicPostchainShareCloud(...args));
const loadPostchainConsentCloud: typeof PostchainConsentModule.loadPostchainConsentCloud = (
  ...args
) => loadPostchainConsent().then((m) => m.loadPostchainConsentCloud(...args));
const savePostchainConsentCloud: typeof PostchainConsentModule.savePostchainConsentCloud = (
  ...args
) => loadPostchainConsent().then((m) => m.savePostchainConsentCloud(...args));

import { buildCityPreferenceProfile, type DmMemorySnapshot } from "@/lib/city-preference";
import { supabase } from "@/integrations/supabase/client";
import { qrSvgDataUrl } from "@/lib/qr";
import { buildSerialInsights } from "@/lib/serial-insights";
import { reportPagePerf } from "@/lib/perf-monitor";

export const Route = createFileRoute("/me")({ component: MePage });

type AssetMode = "single" | "longterm";
type Tab = "novel" | "poster" | "library" | "profile";
type MainTab = "routes" | "collection" | "profile" | "generate";
type RouteScreen = "overview" | "detail" | "poster";
type RouteDetailTab = "overview" | "timeline" | "records";
type RangeKey = "30d" | "90d" | "year" | "all";
type CollectionKind = "all" | "places" | "activities" | "planned";
type CollectionDateRange = { from: string; to: string };
type SortKey = "recent" | "enhanced" | "order";
type PendingPlan = {
  id: string;
  title: string;
  subtitle: string;
  source: string;
  createdAt: number;
  tags: string[];
};
export type MeFilters = {
  sort: SortKey;
  onlyPhoto: boolean;
  onlyNote: boolean;
  minLevel: number; // 0/1/2/3
};

type ReportEdits = Partial<
  Pick<
    PostchainReport,
    "title" | "identityBadge" | "flexLine" | "bragLine" | "ending" | "nextHook" | "storyFragments"
  >
>;

type ToastState = { id: number; message: string } | null;
type ExportReadyState = {
  url: string;
  filename: string;
  title: string;
  description: string;
} | null;

const POSTCHAIN_ENTRY_KEY = "todaypersona:open-postchain:v1";
const POSTCHAIN_AUTH_KEY = "todaypersona:postchain-auth:v1";
const POSTCHAIN_PRIVACY_KEY = "todaypersona:postchain-privacy:v1";
const PENDING_PLANS_KEY = "todaypersona:pending-plans:v1";

const DEFAULT_POSTCHAIN_PRIVACY: PostchainPrivacySettings = {
  showMerchantNames: true,
  showVisitTime: false,
  showLocation: true,
  showPhotos: true,
  showAmount: false,
  showDiscount: false,
};

function loadPostchainAuth(): PostchainAuthLevel | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(POSTCHAIN_AUTH_KEY);
  return value === "basic" || value === "personal" || value === "full" ? value : null;
}

function loadPostchainPrivacy(): PostchainPrivacySettings {
  if (typeof window === "undefined") return DEFAULT_POSTCHAIN_PRIVACY;
  try {
    const saved = JSON.parse(localStorage.getItem(POSTCHAIN_PRIVACY_KEY) || "{}");
    return { ...DEFAULT_POSTCHAIN_PRIVACY, ...saved };
  } catch {
    return DEFAULT_POSTCHAIN_PRIVACY;
  }
}

function loadPendingPlans(): PendingPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(localStorage.getItem(PENDING_PLANS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function filterSagasByRange(sagas: ArchivedChapter[], range: RangeKey): ArchivedChapter[] {
  if (range === "all") return sagas;
  const now = Date.now();
  const days = range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const start = now - days * 24 * 60 * 60 * 1000;
  return sagas.filter((chapter) => (chapter.archivedAt ?? chapter.createdAt) >= start);
}

function describeRange(range: RangeKey): string {
  if (range === "30d") return "近 30 天";
  if (range === "90d") return "近 90 天";
  if (range === "year") return "近 1 年";
  return "全部时间";
}

function MePage() {
  const navigate = useNavigate();

  // 性能监测：首屏 / Web Vitals / 资源体积，控制台输出
  useEffect(() => {
    reportPagePerf("me");
  }, []);

  const [mainTab, setMainTab] = useState<MainTab>("routes");
  const [routeScreen, setRouteScreen] = useState<RouteScreen>(() => {
    if (typeof window !== "undefined" && localStorage.getItem(POSTCHAIN_ENTRY_KEY) === "1") {
      localStorage.removeItem(POSTCHAIN_ENTRY_KEY);
      return "poster";
    }
    return "overview";
  });
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [routeDetailTab, setRouteDetailTab] = useState<RouteDetailTab>("timeline");
  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionKind, setCollectionKind] = useState<CollectionKind>("all");
  const [collectionDateRange, setCollectionDateRange] = useState<CollectionDateRange>({
    from: "",
    to: "",
  });
  const [pendingPlans, setPendingPlans] = useState<PendingPlan[]>(loadPendingPlans);
  const [rangeKey, setRangeKey] = useState<RangeKey>("90d");
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState<ToastState>(null);
  const [dmMemory, setDmMemory] = useState<DmMemorySnapshot | null>(null);
  const [cloudStatus, setCloudStatus] = useState<"idle" | "syncing" | "synced" | "local">("idle");

  const sagas = loadSagas();
  const rangedSagas = useMemo(() => filterSagasByRange(sagas, rangeKey), [rangeKey, sagas]);
  const library = useMemo(() => buildLibrary(sagas), [sagas]);
  const preferenceProfile = useMemo(
    () => buildCityPreferenceProfile(rangedSagas, dmMemory),
    [rangedSagas, dmMemory],
  );

  useEffect(() => {
    let cancelled = false;
    setCloudStatus("syncing");
    hydrateSagasFromCloud()
      .then(() => {
        if (!cancelled) {
          setCloudStatus("synced");
          setReloadKey((key) => key + 1);
        }
      })
      .catch(() => {
        if (!cancelled) setCloudStatus("local");
      });

    (async () => {
      try {
        const { data, error } = await supabase
          .from("dm_memory")
          .select("profile,loved_tags,disliked_tags,visited_pois,total_runs")
          .eq("player_key", "default")
          .maybeSingle();
        if (!cancelled && !error && data) setDmMemory(data);
      } catch {
        if (!cancelled) setCloudStatus("local");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const chapters = sagas.length;
    const scenes = sagas.reduce((s, c) => s + c.completedSceneOrders.length, 0);
    const enhanced = sagas.reduce(
      (s, c) => s + Object.values(c.sceneRecords ?? {}).filter((r) => r.note || r.photo).length,
      0,
    );
    const citySet = new Set(sagas.map((c) => (c.city || "").trim()).filter(Boolean));
    const cities = citySet.size;
    const rarities = new Set(sagas.map((c) => c.card.rarity));
    return { chapters, scenes, enhanced, cities, rarities: rarities.size };
  }, [sagas]);

  const latestChapter = sagas[0] ?? null;
  const selectedChapter =
    sagas.find((chapter) => chapter.chapterId === selectedChapterId) ?? latestChapter;
  const selectedChapterNo = selectedChapter
    ? sagas.length - sagas.findIndex((chapter) => chapter.chapterId === selectedChapter.chapterId)
    : 1;
  const syncLabel =
    cloudStatus === "syncing" ? "同步中" : cloudStatus === "synced" ? "已同步" : "本地保存";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [mainTab, routeScreen]);

  function notify(message: string) {
    const id = Date.now();
    setToast({ id, message });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2400);
  }

  function addPendingPlan(plan: Omit<PendingPlan, "id" | "createdAt">) {
    const nextPlan: PendingPlan = {
      ...plan,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    setPendingPlans((current) => {
      const next = [nextPlan, ...current].slice(0, 24);
      localStorage.setItem(PENDING_PLANS_KEY, JSON.stringify(next));
      return next;
    });
    setCollectionKind("planned");
    notify("已加入待出行，可在素材库查看");
  }

  function openRoute(chapter: ArchivedChapter) {
    setSelectedChapterId(chapter.chapterId);
    setRouteDetailTab("timeline");
    setRouteScreen("detail");
    setMainTab("routes");
  }

  function openPoster(chapter = selectedChapter) {
    if (chapter) setSelectedChapterId(chapter.chapterId);
    setRouteScreen("poster");
    setMainTab("routes");
  }

  function goHome() {
    setRouteScreen("overview");
    setMainTab("routes");
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        background:
          "radial-gradient(1100px 560px at 8% 0%, rgba(252,228,236,0.58), transparent 60%), radial-gradient(900px 520px at 100% 100%, rgba(255,244,224,0.7), transparent 62%), linear-gradient(180deg,#fdfaf6 0%,#fff4ec 58%,#fdf0f5 100%)",
      }}
    >
      <div className="mx-auto grid max-w-xl grid-cols-[72px_1fr_72px] items-center px-5 pt-6">
        <button
          onClick={() => navigate({ to: "/" })}
          className="display text-[11px] tracking-[0.3em] text-[var(--ink)] opacity-70"
        >
          首页
        </button>
        <h1 className="text-center cn-serif text-[21px] text-[var(--ink)]">我的连载</h1>
        <button
          onClick={() => navigate({ to: "/library" })}
          className="display text-[10px] tracking-[0.4em] text-[var(--ink-soft)] hover:text-[var(--ink)] transition text-right"
          aria-label="打开连载书架"
        >
          书架 →
        </button>

      </div>

      <MainTabs
        active={mainTab}
        onChange={(tab) => {
          setMainTab(tab);
          if (tab !== "routes") setRouteScreen("overview");
        }}
      />

      <main className="mx-auto mt-5 max-w-xl px-5">
        {mainTab === "routes" && routeScreen === "overview" && (
          <RoutesHome
            sagas={sagas}
            stats={stats}
            syncLabel={syncLabel}
            onOpenRoute={openRoute}
            onOpenPoster={openPoster}
            onCreate={() => navigate({ to: "/" })}
            onNotify={notify}
          />
        )}
        {mainTab === "routes" && routeScreen === "detail" && selectedChapter && (
          <RouteDetailPage
            chapter={selectedChapter}
            chapterNo={selectedChapterNo}
            stats={stats}
            activeTab={routeDetailTab}
            onTabChange={setRouteDetailTab}
            onBack={goHome}
            onPoster={() => openPoster(selectedChapter)}
            onCreate={() => navigate({ to: "/" })}
            onNotify={notify}
            onAddPlan={addPendingPlan}
          />
        )}
        {mainTab === "routes" && routeScreen === "poster" && selectedChapter && (
          <ReviewPosterPage
            chapter={selectedChapter}
            chapterNo={selectedChapterNo}
            onBack={() => setRouteScreen("detail")}
            onGo={() => navigate({ to: "/" })}
            onNotify={notify}
          />
        )}
        {mainTab === "routes" && routeScreen !== "overview" && !selectedChapter && (
          <EmptyState onGo={() => navigate({ to: "/" })} />
        )}
        {mainTab === "collection" && (
          <CollectionPage
            sagas={sagas}
            library={library}
            pendingPlans={pendingPlans}
            query={collectionQuery}
            kind={collectionKind}
            dateRange={collectionDateRange}
            onQueryChange={setCollectionQuery}
            onKindChange={setCollectionKind}
            onDateRangeChange={(range) => {
              setCollectionDateRange(range);
              if (range.from && range.to) {
                const label = range.from === range.to ? range.from : `${range.from} 至 ${range.to}`;
                notify(`已筛选 ${label} 的记录`);
              } else {
                notify("已清除日期筛选");
              }
            }}
            onOpenRoute={openRoute}
            onCreate={() => navigate({ to: "/" })}
            onNotify={notify}
            onAddPlan={addPendingPlan}
          />
        )}
        {mainTab === "profile" && (
          <ProfilePage
            profile={preferenceProfile}
            memory={dmMemory}
            sagas={sagas}
            rangeKey={rangeKey}
            rangeLabel={describeRange(rangeKey)}
            onRangeChange={setRangeKey}
            onGenerate={() => setMainTab("generate")}
            onNotify={notify}
          />
        )}
        {mainTab === "generate" && (
          <GeneratePage
            profile={preferenceProfile}
            latestChapter={latestChapter}
            onGo={() => navigate({ to: "/" })}
            onNotify={notify}
            onAddPlan={addPendingPlan}
          />
        )}
      </main>
      <Toast toast={toast} />
    </div>
  );
}

function formatArchiveDate(ts: number) {
  const date = new Date(ts);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function formatIsoDate(ts: number) {
  const date = new Date(ts);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatReadableDate(iso: string) {
  return iso ? iso.replaceAll("-", ".") : "";
}

function isDateInRange(ts: number, range: CollectionDateRange) {
  if (!range.from && !range.to) return true;
  const date = formatIsoDate(ts);
  const from = range.from || range.to;
  const to = range.to || range.from;
  return date >= from && date <= to;
}

function routeCompletion(chapter: ArchivedChapter) {
  const total = chapter.journey.scenes.length;
  const done = chapter.completedSceneOrders.length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function completedScenes(chapter: ArchivedChapter) {
  return chapter.journey.scenes.filter((scene) =>
    chapter.completedSceneOrders.includes(scene.order),
  );
}

function imageForChapter(chapter?: ArchivedChapter | null) {
  return (
    getCoverById(chapter?.card.id) ||
    chapter?.card.cover ||
    chapter?.sceneRecords?.[chapter.completedSceneOrders[0]]?.photo ||
    ""
  );
}

function imageForCard(card?: ArchivedChapter["card"] | null, photo?: string) {
  return getCoverById(card?.id) || card?.cover || photo || "";
}

function PrimaryActionButton({
  children,
  onClick,
  disabled,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#6f5850_0%,#8f6c62_100%)] px-4 cn-serif text-[14px] text-white shadow-[0_18px_36px_-26px_rgba(61,53,48,0.42)] transition active:scale-[0.99] disabled:opacity-50"
    >
      {icon}
      {children}
    </button>
  );
}

function TagPill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const Component = onClick ? "button" : "span";
  return (
    <Component
      onClick={onClick}
      className={`inline-flex min-h-8 items-center rounded-full border px-3 cn-serif text-[11px] transition ${
        active
          ? "border-[#ead8d0] bg-[#fff4ec] text-[#7f4f5c]"
          : "border-[#ead8d0] bg-white/62 text-[var(--ink-soft)]"
      }`}
    >
      {children}
    </Component>
  );
}

function MainTabs({ active, onChange }: { active: MainTab; onChange: (tab: MainTab) => void }) {
  const tabs: Array<{ key: MainTab; label: string; icon: React.ReactNode }> = [
    { key: "routes", label: "路线", icon: <RouteIcon size={17} strokeWidth={1.7} /> },
    { key: "collection", label: "素材", icon: <Stamp size={17} strokeWidth={1.7} /> },
    { key: "profile", label: "画像", icon: <UserRound size={17} strokeWidth={1.7} /> },
    { key: "generate", label: "生成", icon: <WandSparkles size={17} strokeWidth={1.7} /> },
  ];
  return (
    <nav className="mx-auto mt-4 max-w-xl px-5" aria-label="My Archive 主导航">
      <div className="grid grid-cols-4 rounded-[22px] border border-[#ead8d0] bg-[#fffaf2]/88 p-1.5 shadow-[0_14px_42px_-36px_rgba(61,53,48,0.38)]">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-[16px] cn-serif text-[13px] transition ${
                isActive ? "bg-[#fff4ec] text-[#7f4f5c]" : "text-[var(--ink-soft)]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

type OverviewFocusKey = "latest" | "all" | "city";

function OverviewStats({
  stats,
  syncLabel,
  sagas,
}: {
  stats: { chapters: number; scenes: number; enhanced: number; cities: number; rarities: number };
  syncLabel: string;
  sagas: ArchivedChapter[];
}) {
  const cityList = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const c of sagas) {
      const k = (c.city || "").trim();
      if (k && !seen.has(k)) { seen.add(k); order.push(k); }
    }
    return order;
  }, [sagas]);

  const [activeKey, setActiveKey] = useState<OverviewFocusKey>("latest");
  const [cityIdx, setCityIdx] = useState(0);

  const focus =
    activeKey === "all"
      ? ({ kind: "all" } as const)
      : activeKey === "city" && cityList.length > 0
        ? ({ kind: "city", city: cityList[cityIdx % cityList.length] } as const)
        : ({ kind: "latest" } as const);

  const items: Array<{
    key: OverviewFocusKey;
    icon: ReactNode;
    value: number | string;
    label: string;
    hint: string;
    disabled?: boolean;
  }> = [
    {
      key: "latest",
      icon: <RouteIcon size={16} strokeWidth={1.7} />,
      value: stats.chapters,
      label: activeKey === "latest" ? "最近一条" : "条路线",
      hint: "点击：地图聚焦最近一条路线（再点切换到全部）",
    },
    {
      key: "all",
      icon: <MapPinned size={16} strokeWidth={1.7} />,
      value: stats.scenes,
      label: "已打卡",
      hint: "点击：地图展示全部路线的所有打卡点",
    },
    {
      key: "city",
      icon: <MapPinned size={16} strokeWidth={1.7} />,
      value: stats.cities,
      label: activeKey === "city" && cityList.length > 0 ? cityList[cityIdx % cityList.length] : "座城市",
      hint: cityList.length > 1 ? "点击：在城市之间切换聚焦" : "点击：地图聚焦到这座城市",
      disabled: cityList.length === 0,
    },
  ];

  function handleClick(key: OverviewFocusKey) {
    if (key === "latest") {
      // toggle latest ↔ all
      setActiveKey((prev) => (prev === "latest" ? "all" : "latest"));
      return;
    }
    if (key === "all") {
      setActiveKey("all");
      return;
    }
    if (key === "city") {
      if (cityList.length === 0) return;
      if (activeKey !== "city") {
        setActiveKey("city");
        setCityIdx(0);
      } else {
        setCityIdx((i) => (i + 1) % cityList.length);
      }
    }
  }

  return (
    <section className="rounded-[22px] border border-[#ead8d0] bg-[#fffaf2]/90 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="cn-serif text-[12px] text-[var(--ink-soft)]">路线总览 · {syncLabel}</div>
        <span className="rounded-full bg-[#fff4ec] px-2 py-1 cn-serif text-[10px] text-[#7f4f5c]">
          点击数字 · 切换地图视野
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const active =
            (item.key === "latest" && activeKey === "latest") ||
            (item.key === "all" && activeKey === "all") ||
            (item.key === "city" && activeKey === "city");
          return (
            <button
              key={item.key}
              type="button"
              title={item.hint}
              disabled={item.disabled}
              onClick={() => handleClick(item.key)}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-[18px] border px-2 text-left transition active:scale-[0.98] ${
                active
                  ? "bg-[#fff1e8] shadow-[0_4px_12px_-6px_rgba(127,79,92,0.4)] border-yellow-600"
                  : "border-[#eee0d8] bg-white/60 hover:border-[#d9c3b8] hover:bg-white/80"

              } ${item.disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span className={active ? "text-[#7f4f5c]" : "text-[#6f5850]"}>{item.icon}</span>
              <div className="min-w-0">
                <div className="display text-[18px] leading-none text-[var(--ink)]">{item.value}</div>
                <div className="cn-serif text-[10px] text-[var(--ink-soft)] truncate">{item.label}</div>
              </div>
            </button>
          );
        })}
      </div>
      <RouteOverviewMap sagas={sagas} focus={focus} />
    </section>
  );
}


function RouteSummaryCard({
  chapter,
  index,
  compact,
  onOpen,
  onPoster,
}: {
  chapter: ArchivedChapter;
  index: number;
  compact?: boolean;
  onOpen: () => void;
  onPoster?: () => void;
}) {
  const { done, total, pct } = routeCompletion(chapter);
  const date = formatArchiveDate(chapter.createdAt);
  const image = imageForChapter(chapter);
  const fallback = `linear-gradient(135deg, ${chapter.card.colors[0]}, ${chapter.card.colors[1]})`;
  const visited = completedScenes(chapter);
  const mapHref = visited.length
    ? `https://uri.amap.com/search?keyword=${encodeURIComponent(
        visited.map((s) => s.location_name).join(" "),
      )}${chapter.city ? `&city=${encodeURIComponent(chapter.city)}` : ""}&src=todaypersona&callnative=1`
    : "";
  return (
    <article
      className={`group relative overflow-hidden rounded-[22px] border border-white/70 bg-[#eee4d2] shadow-[0_22px_60px_-44px_rgba(61,53,48,0.45)] ${
        compact ? "min-h-[116px]" : "min-h-[200px]"
      }`}
      style={!image ? { background: fallback } : undefined}
    >
      {image && (
        <img
          src={image}
          alt={chapter.card.identity}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
        />
      )}
      {/* 适度暗化层 —— 保证白字可读，但不把封面压成纯黑 */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,22,18,0.10)_0%,rgba(35,22,18,0.28)_55%,rgba(20,12,10,0.55)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,12,10,0.35)_0%,rgba(20,12,10,0.05)_55%,rgba(20,12,10,0.0)_100%)]" />
      <button
        onClick={onOpen}
        className="relative flex min-h-[inherit] w-full flex-col justify-end p-4 text-left text-white"
      >
        <div className="mb-auto flex items-start justify-between gap-3">
          <span className="rounded-full border border-white/40 bg-black/35 px-2.5 py-1 cn-serif text-[10px] text-white backdrop-blur">
            {chapter.card.rarity}
          </span>
          <ChevronRight size={18} strokeWidth={1.7} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
        </div>
        <div className="max-w-[88%]" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.55)" }}>
          <div className="cn-serif text-[10px] text-white/90">
            {chapter.city || "城市"} · {date}
          </div>
          <h3
            className={`mt-1 line-clamp-2 cn-serif leading-snug text-white ${
              compact ? "text-[16px]" : "text-[20px]"
            }`}
          >
            {chapter.card.identity}
          </h3>
          <div className="mt-1 cn-serif text-[11px] text-white/95">
            已打卡 {done}/{total} 处 · {pct}%
          </div>
          {!compact && visited.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {visited.slice(0, 4).map((s) => (
                <span
                  key={s.order}
                  className="inline-flex max-w-[140px] items-center gap-1 truncate rounded-full border border-white/35 bg-white/22 px-2 py-[3px] cn-serif text-[10px] text-white backdrop-blur"
                  title={s.location_name}
                >
                  <span aria-hidden>✓</span>
                  <span className="truncate">{s.location_name}</span>
                </span>
              ))}
              {visited.length > 4 && (
                <span className="rounded-full border border-white/30 bg-white/18 px-2 py-[3px] cn-serif text-[10px] text-white/85">
                  +{visited.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/26">
          <div className="h-full rounded-full bg-[#fff7ea]/95" style={{ width: `${pct}%` }} />
        </div>
        {!compact && (mapHref || onPoster) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {mapHref && (
              <a
                href={mapHref}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex min-h-9 items-center gap-1 rounded-full border border-white/34 bg-white/85 px-3 cn-serif text-[12px] text-[#4f4944] shadow-sm backdrop-blur"
                title="在高德地图上标出这条路线的所有打卡点"
              >
                <MapPinned size={13} strokeWidth={1.8} />
                在地图查看
              </a>
            )}
            {onPoster && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onPoster();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onPoster();
                  }
                }}
                className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-white/34 bg-white/85 px-3 cn-serif text-[12px] text-[#4f4944] shadow-sm backdrop-blur"
              >
                生成复盘海报
              </span>
            )}
          </div>
        )}
      </button>
    </article>
  );
}

function RoutesHome({
  sagas,
  stats,
  syncLabel,
  onOpenRoute,
  onOpenPoster,
  onCreate,
}: {
  sagas: ArchivedChapter[];
  stats: { chapters: number; scenes: number; enhanced: number; cities: number; rarities: number };
  syncLabel: string;
  onOpenRoute: (chapter: ArchivedChapter) => void;
  onOpenPoster: (chapter: ArchivedChapter) => void;
  onCreate: () => void;
  onNotify: (message: string) => void;
}) {
  const latest = sagas[0];
  if (!latest) return <EmptyState onGo={onCreate} />;
  return (
    <div className="space-y-5">
      <OverviewStats stats={stats} syncLabel={syncLabel} sagas={sagas} />
      <section>
        <div className="mb-2 cn-serif text-[14px] text-[var(--ink)]">今日进度</div>
        <RouteSummaryCard
          chapter={latest}
          index={0}
          onOpen={() => onOpenRoute(latest)}
          onPoster={() => onOpenPoster(latest)}
        />
      </section>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="cn-serif text-[14px] text-[var(--ink)]">最近路线</div>
          <div className="cn-serif text-[11px] text-[var(--ink-soft)]">一眼了解</div>
        </div>
        <div className="space-y-3">
          {sagas.slice(1, 4).map((chapter, index) => (
            <RouteSummaryCard
              key={chapter.chapterId}
              chapter={chapter}
              index={index + 1}
              compact
              onOpen={() => onOpenRoute(chapter)}
            />
          ))}
        </div>
      </section>
      <PrimaryActionButton onClick={onCreate} icon={<Plus size={17} strokeWidth={1.8} />}>
        新建路线
      </PrimaryActionButton>
    </div>
  );
}

function RouteTimeline({
  chapter,
  onNotify,
  onAddPlan,
}: {
  chapter: ArchivedChapter;
  onNotify: (message: string) => void;
  onAddPlan: (plan: Omit<PendingPlan, "id" | "createdAt">) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(chapter.completedSceneOrders[0] ?? null);
  return (
    <ol className="space-y-3">
      {chapter.journey.scenes.map((scene, index) => {
        const done = chapter.completedSceneOrders.includes(scene.order);
        const rec = chapter.sceneRecords?.[scene.order];
        const time = rec?.completedAt ? new Date(rec.completedAt) : null;
        const timeLabel = time
          ? `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`
          : index === 0
            ? "08:30"
            : index === 1
              ? "12:00"
              : "18:30";
        const isOpen = expanded === scene.order;
        return (
          <li key={scene.order} className="relative border-l border-[#ead8d0]">
            <span className="absolute -left-[5px] top-5 z-10 h-2.5 w-2.5 rounded-full border-2 border-[#6f5850] bg-[#fffaf2]" />
            {index < chapter.journey.scenes.length - 1 && (
              <span className="absolute -left-px top-7 h-[calc(100%+12px)] w-px bg-[#ead8d0]" />
            )}
            <button
              onClick={() => setExpanded(isOpen ? null : scene.order)}
              className="w-full rounded-[18px] border border-[#ead8d0] bg-[#fffaf2]/92 p-3 pl-5 text-left"
            >
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#fff4ec] px-2.5 py-1 cn-serif text-[10px] text-[#7f4f5c]">
                <Clock3 size={12} strokeWidth={1.8} />
                {timeLabel}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[14px] bg-[#fff4ec]">
                  {rec?.photo ? (
                    <img src={rec.photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <VenueIcon
                      kind={detectVenue(scene.location_type, scene.location_name)}
                      size={56}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate cn-serif text-[14px] text-[var(--ink)]">
                      {scene.scene_name}
                    </h3>
                    {done && (
                      <span className="shrink-0 rounded-full bg-[#fff4ec] px-2 py-0.5 cn-serif text-[10px] text-[#7f4f5c]">
                        已完成
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 cn-serif text-[11px] text-[var(--ink-soft)]">
                    STEP {scene.order} · {scene.location_type}
                  </div>
                </div>
                <ChevronRight
                  size={17}
                  strokeWidth={1.7}
                  className={`text-[var(--ink-soft)] transition ${isOpen ? "rotate-90" : ""}`}
                />
              </div>
              {isOpen && (
                <div className="mt-3 rounded-[16px] bg-[#f4eef2] px-3 py-3">
                  <div className="cn-serif text-[12px] text-[var(--ink)]">
                    {scene.location_name} · {scene.action_task}
                  </div>
                  <p className="mt-1 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
                    {rec?.note || scene.persona_narrative}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {scene.emotion_tags.slice(0, 3).map((tag) => (
                      <TagPill key={tag}>{tag}</TagPill>
                    ))}
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddPlan({
                        title: scene.location_name,
                        subtitle: scene.scene_name,
                        source: "路线时间线",
                        tags: [scene.location_type, ...scene.emotion_tags.slice(0, 2)],
                      });
                    }}
                    className="mt-3 min-h-9 rounded-full border border-[#ead8d0] bg-white/70 px-3 cn-serif text-[11px] text-[var(--ink)]"
                  >
                    再次安排
                  </button>
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function RouteDetailPage({
  chapter,
  chapterNo,
  stats,
  activeTab,
  onTabChange,
  onBack,
  onPoster,
  onCreate,
  onNotify,
  onAddPlan,
}: {
  chapter: ArchivedChapter;
  chapterNo: number;
  stats: { chapters: number; scenes: number; enhanced: number; cities: number; rarities: number };
  activeTab: RouteDetailTab;
  onTabChange: (tab: RouteDetailTab) => void;
  onBack: () => void;
  onPoster: () => void;
  onCreate: () => void;
  onNotify: (message: string) => void;
  onAddPlan: (plan: Omit<PendingPlan, "id" | "createdAt">) => void;
}) {
  const [panel, setPanel] = useState<"saved" | "more" | null>(null);
  const { done, total, pct } = routeCompletion(chapter);
  const date = formatArchiveDate(chapter.createdAt);
  const places = completedScenes(chapter);
  const tabs: Array<[RouteDetailTab, string]> = [
    ["overview", "概览"],
    ["timeline", "时间线与地点"],
    ["records", "记录"],
  ];
  return (
    <div className="space-y-5">
      {panel === "saved" && (
        <FlowPanel
          title="已加入收藏"
          description="这条路线已经保存到素材库，后续可以通过搜索、日期或路线分类找到。"
          onClose={() => setPanel(null)}
        >
          <div className="grid gap-2">
            <button
              onClick={() => {
                setPanel(null);
                onNotify("可以在素材库查看这条路线");
              }}
              className="min-h-11 rounded-[16px] border border-[#ead8d0] bg-white/66 cn-serif text-[13px] text-[var(--ink)]"
            >
              稍后去素材库查看
            </button>
            <button
              onClick={() => setPanel(null)}
              className="min-h-11 rounded-[16px] bg-[#6f5850] cn-serif text-[13px] text-white"
            >
              继续查看路线
            </button>
          </div>
        </FlowPanel>
      )}
      {panel === "more" && (
        <FlowPanel
          title="路线更多操作"
          description="低频和危险操作统一收在这里，避免主页面按钮过多。"
          onClose={() => setPanel(null)}
        >
          <div className="grid gap-2">
            {["导出路线 PDF", "生成分享链接", "编辑路线信息"].map((item) => (
              <button
                key={item}
                onClick={() => {
                  onNotify(`${item}已准备好`);
                  setPanel(null);
                }}
                className="min-h-11 rounded-[16px] border border-[#ead8d0] bg-white/66 cn-serif text-[13px] text-[var(--ink)]"
              >
                {item}
              </button>
            ))}
            <button
              onClick={() => {
                if (window.confirm("删除后不可恢复，确认删除这条路线记录？")) {
                  onNotify("已进入删除确认流程");
                }
              }}
              className="min-h-11 rounded-[16px] border border-[#efc7c0] bg-[#fff3f2] cn-serif text-[13px] text-[#9d544c]"
            >
              删除路线
            </button>
          </div>
        </FlowPanel>
      )}
      <section className="rounded-[24px] border border-[#ead8d0] bg-[#fffaf2]/94 p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            aria-label="返回路线总览"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#ead8d0] bg-white/60 px-3 cn-serif text-[12px] text-[var(--ink)] transition hover:border-[#d9c3b8] hover:bg-white active:scale-[0.98]"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            路线总览
          </button>
          <div className="inline-flex items-center gap-0 rounded-full border border-[#ead8d0] bg-white/60 p-0.5">
            <button
              onClick={onPoster}
              aria-label="分享复盘"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink)] transition hover:bg-[#f3e7df] active:scale-95"
            >
              <Share2 size={15} strokeWidth={1.8} />
            </button>
            <span className="h-4 w-px bg-[#ead8d0]" aria-hidden />
            <button
              onClick={() => setPanel("saved")}
              aria-label="收藏路线"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink)] transition hover:bg-[#f3e7df] active:scale-95"
            >
              <Star size={15} strokeWidth={1.8} />
            </button>
            <span className="h-4 w-px bg-[#ead8d0]" aria-hidden />
            <button
              onClick={() => setPanel("more")}
              aria-label="更多操作"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink)] transition hover:bg-[#f3e7df] active:scale-95"
            >
              <MoreHorizontal size={15} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="mt-3">
          <TagPill>{chapter.card.rarity}</TagPill>
          <h1 className="mt-2 cn-serif text-[24px] leading-tight text-[var(--ink)]">
            {chapter.card.identity}
          </h1>
          <div className="mt-1 cn-serif text-[12px] text-[var(--ink-soft)]">
            {chapter.city || "城市"} · {date} · {done}/{total} 地点 · 完成度 {pct}%
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-[#ead8d0] rounded-[18px] border border-[#ead8d0] bg-white/54 py-3 text-center">
          <MiniStatPlain value={stats.chapters} label="出门次数" />
          <MiniStatPlain value={Math.min(6, stats.chapters)} label="周末出行" />
          <MiniStatPlain value={stats.scenes} label="地点累计" />
        </div>
      </section>

      <div className="grid grid-cols-3 gap-1 rounded-[18px] border border-[#ead8d0] bg-[#fffaf2]/86 p-1">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`min-h-10 rounded-[14px] cn-serif text-[12px] ${
              activeTab === key ? "bg-[#fff4ec] text-[#7f4f5c]" : "text-[var(--ink-soft)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "timeline" && (
        <RouteTimeline chapter={chapter} onNotify={onNotify} onAddPlan={onAddPlan} />
      )}
      {activeTab === "overview" && (
        <section className="rounded-[22px] border border-[#ead8d0] bg-[#fffaf2]/92 p-4">
          <h2 className="cn-serif text-[17px] text-[var(--ink)]">路线概览</h2>
          <p className="mt-2 cn-serif text-[13px] leading-relaxed text-[var(--ink)]">
            {chapter.journey.story_opening}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[chapter.city, chapter.card.rarity, ...places.flatMap((scene) => scene.emotion_tags)]
              .filter(Boolean)
              .slice(0, 8)
              .map((tag) => (
                <TagPill key={tag}>{tag}</TagPill>
              ))}
          </div>
        </section>
      )}
      {activeTab === "records" && (
        <section className="rounded-[22px] border border-[#ead8d0] bg-[#fffaf2]/92 p-4">
          <h2 className="cn-serif text-[17px] text-[var(--ink)]">补充记录</h2>
          <p className="mt-2 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
            已有{" "}
            {
              Object.values(chapter.sceneRecords ?? {}).filter(
                (record) => record.note || record.photo,
              ).length
            }{" "}
            条补充随笔或照片。
          </p>
          <PrimaryActionButton onClick={onCreate} icon={<PenLine size={17} strokeWidth={1.8} />}>
            补充一条记录
          </PrimaryActionButton>
        </section>
      )}
      <PrimaryActionButton onClick={onPoster} icon={<Download size={17} strokeWidth={1.8} />}>
        生成复盘海报
      </PrimaryActionButton>
    </div>
  );
}

function MiniStatPlain({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="display text-[19px] leading-none text-[#8f6c62]">{value}</div>
      <div className="mt-1 cn-serif text-[10px] text-[var(--ink-soft)]">{label}</div>
    </div>
  );
}

function FlowPanel({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-[#6f5850]/24 backdrop-blur-sm" onClick={onClose} />
      <section
        className="relative max-h-[86vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] border border-[#ead8d0] bg-[#fffaf2] p-5 shadow-[0_30px_80px_-40px_rgba(61,53,48,0.42)] sm:rounded-[28px]"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#ead8d0] bg-white/76 text-[var(--ink-soft)]"
        >
          <X size={16} strokeWidth={1.8} />
        </button>
        <h3 className="pr-10 cn-serif text-[19px] text-[var(--ink)]">{title}</h3>
        {description && (
          <p className="mt-1 pr-8 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
            {description}
          </p>
        )}
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}

function ExportReadyPanel({
  exportReady,
  onClose,
}: {
  exportReady: NonNullable<ExportReadyState>;
  onClose: () => void;
}) {
  return (
    <FlowPanel title={exportReady.title} description={exportReady.description} onClose={onClose}>
      <div className="grid gap-3">
        <a
          href={exportReady.url}
          download={exportReady.filename}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[#8f6c62] cn-serif text-[13px] text-white"
        >
          打开 / 下载文件
        </a>
        <div className="rounded-[16px] border border-[#ead8d0] bg-white/62 px-3 py-2 cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)]">
          文件名：{exportReady.filename}
        </div>
      </div>
    </FlowPanel>
  );
}

function ReviewPosterPage({
  chapter,
  chapterNo,
  onBack,
  onGo,
  onNotify,
}: {
  chapter: ArchivedChapter;
  chapterNo: number;
  onBack: () => void;
  onGo: () => void;
  onNotify: (message: string) => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportReady, setExportReady] = useState<ExportReadyState>(null);
  const [exportPickerOpen, setExportPickerOpen] = useState(false);
  const [reuseOpen, setReuseOpen] = useState(false);
  const [panel, setPanel] = useState<"cover" | "share" | "edit" | "settings" | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const privacy = loadPostchainPrivacy();
  const authLevel = loadPostchainAuth() ?? "basic";
  const report = buildPostchainReport(chapter, { authLevel, reportStyle: "literary", privacy });
  const dateStr = formatArchiveDate(chapter.createdAt);
  const shareText = report.contentVariants[0]?.sections[0]?.text ?? report.shareText;

  async function exportPoster(type: "image/png" | "image/jpeg" = "image/png") {
    const el = posterRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const blob = await elementToImageBlob(el, type);
      const filename = `MyArchive_复盘海报_CH${String(chapterNo).padStart(2, "0")}.${type === "image/jpeg" ? "jpg" : "png"}`;
      const url = await downloadBlob(blob, filename);
      setExportReady({
        url,
        filename,
        title: "海报图片已生成",
        description: "如果当前预览浏览器没有自动下载，请点击下面的文件入口打开或保存。",
      });
      onNotify("图片已生成");
    } catch (err) {
      onNotify("导出失败：" + (err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(shareText);
      onNotify("已复制分享文案");
    } catch {
      window.alert(shareText);
    }
  }

  return (
    <div className="space-y-5">
      {exportPickerOpen && (
        <ExportSizeDialog
          exporting={exporting}
          onClose={() => setExportPickerOpen(false)}
          onPick={(type) => {
            setExportPickerOpen(false);
            void exportPoster(type);
          }}
        />
      )}
      {exportReady && (
        <ExportReadyPanel exportReady={exportReady} onClose={() => setExportReady(null)} />
      )}
      {reuseOpen && (
        <ReuseRouteDialog
          title={report.title}
          onClose={() => setReuseOpen(false)}
          onGo={onGo}
          onNotify={onNotify}
        />
      )}
      {panel === "cover" && (
        <FlowPanel
          title="更换海报封面"
          description="选择当前路线照片、系统封面或默认奶油封面，确认后会用于导出的海报预览。"
          onClose={() => setPanel(null)}
        >
          <div className="grid grid-cols-3 gap-2">
            {["用户照片", "系统封面", "默认封面"].map((item, index) => (
              <button
                key={item}
                onClick={() => {
                  onNotify(`已选择${item}`);
                  setPanel(null);
                }}
                className={`min-h-24 rounded-[18px] border border-[#ead8d0] cn-serif text-[12px] ${
                  index === 0 ? "bg-[#fff4ec]" : "bg-white/62"
                } text-[var(--ink)]`}
              >
                {item}
              </button>
            ))}
          </div>
        </FlowPanel>
      )}
      {panel === "share" && (
        <FlowPanel
          title="分享到社区"
          description="先选择发布去向，再进入对应发布流程。"
          onClose={() => setPanel(null)}
        >
          <div className="grid gap-2">
            {["我的动态", "同城路线广场", "复制为分享链接"].map((item) => (
              <button
                key={item}
                onClick={() => {
                  onNotify(`${item}已准备好`);
                  setPanel(null);
                }}
                className="min-h-11 rounded-[16px] border border-[#ead8d0] bg-white/64 cn-serif text-[13px] text-[var(--ink)]"
              >
                {item}
              </button>
            ))}
          </div>
        </FlowPanel>
      )}
      {panel === "edit" && (
        <FlowPanel
          title="编辑发布"
          description="这里可以调整标题、分享文案和发布口吻。"
          onClose={() => setPanel(null)}
        >
          <div className="grid gap-3">
            <label className="grid gap-1 cn-serif text-[12px] text-[var(--ink-soft)]">
              发布标题
              <input
                defaultValue={report.title}
                className="min-h-11 rounded-[16px] border border-[#ead8d0] bg-white/70 px-3 cn-serif text-[13px] text-[var(--ink)] outline-none"
              />
            </label>
            <label className="grid gap-1 cn-serif text-[12px] text-[var(--ink-soft)]">
              今日总结
              <textarea
                defaultValue={shareText}
                rows={4}
                className="rounded-[16px] border border-[#ead8d0] bg-white/70 px-3 py-2 cn-serif text-[13px] leading-relaxed text-[var(--ink)] outline-none"
              />
            </label>
            <PrimaryActionButton
              onClick={() => {
                onNotify("发布内容已保存");
                setPanel(null);
              }}
              icon={<Edit3 size={17} strokeWidth={1.8} />}
            >
              保存发布内容
            </PrimaryActionButton>
          </div>
        </FlowPanel>
      )}
      {panel === "settings" && (
        <FlowPanel
          title="导出设置"
          description="选择导出前的低频设置，隐私和删除不会直接暴露在主页面。"
          onClose={() => setPanel(null)}
        >
          <div className="grid gap-2">
            <button
              onClick={() => setExportPickerOpen(true)}
              className="min-h-11 rounded-[16px] border border-[#ead8d0] bg-white/64 cn-serif text-[13px] text-[var(--ink)]"
            >
              选择导出尺寸
            </button>
            <button
              onClick={() => onNotify("已打开隐私设置")}
              className="min-h-11 rounded-[16px] border border-[#ead8d0] bg-white/64 cn-serif text-[13px] text-[var(--ink)]"
            >
              隐私设置
            </button>
          </div>
        </FlowPanel>
      )}
      <section className="rounded-[24px] border border-[#ead8d0] bg-[#fffaf2]/94 p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            aria-label="返回路线详情"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#ead8d0] bg-white/60 px-3 cn-serif text-[12px] text-[var(--ink)] transition hover:border-[#d9c3b8] hover:bg-white active:scale-[0.98]"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            路线详情
          </button>
          <h1 className="cn-serif text-[17px] text-[var(--ink)]">复盘海报</h1>
          <button
            onClick={() => setPanel("settings")}
            aria-label="更多操作"
            className="inline-flex h-9 items-center gap-1 rounded-full border border-[#ead8d0] bg-white/60 px-3 cn-serif text-[12px] text-[var(--ink)] transition hover:border-[#d9c3b8] hover:bg-white active:scale-[0.98]"
          >
            <MoreHorizontal size={15} strokeWidth={1.8} />
            设置
          </button>
        </div>

      </section>

      <section className="rounded-[26px] border border-[#ead8d0] bg-[#fffaf2]/92 p-3">
        <UserPhotoCard variant="inline" />
      </section>

      <div className="relative">
        <button
          onClick={() => setPanel("cover")}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/86 px-3 py-1.5 cn-serif text-[11px] text-[var(--ink)] shadow"
        >
          更换封面
        </button>
        <PostchainPoster
          refEl={posterRef}
          chapter={chapter}
          chapterNo={chapterNo}
          dateStr={dateStr}
          report={report}
          privacy={privacy}
          shareText={shareText}
        />
      </div>

      <section className="rounded-[22px] border border-[#ead8d0] bg-[#fffaf2]/92 p-4">
        <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink)]">{shareText}</p>
      </section>

      <PrimaryActionButton
        onClick={() => setExportPickerOpen(true)}
        disabled={exporting}
        icon={<Download size={17} strokeWidth={1.8} />}
      >
        {exporting ? "导出中…" : "导出图片（海报）"}
      </PrimaryActionButton>

      <div className="grid grid-cols-4 gap-2">
        {[
          {
            label: "分享社区",
            icon: <Share2 size={17} strokeWidth={1.8} />,
            action: () => setPanel("share"),
          },
          { label: "复制文案", icon: <Copy size={17} strokeWidth={1.8} />, action: copyShareText },
          {
            label: "编辑发布",
            icon: <Edit3 size={17} strokeWidth={1.8} />,
            action: () => setPanel("edit"),
          },
          {
            label: "再走一次",
            icon: <RouteIcon size={17} strokeWidth={1.8} />,
            action: () => setReuseOpen(true),
          },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-[18px] border border-[#ead8d0] bg-[#fffaf2]/82 cn-serif text-[11px] text-[var(--ink-soft)]"
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CollectionSearch({
  query,
  kind,
  dateRange,
  onQueryChange,
  onKindChange,
  onDateRangeChange,
}: {
  query: string;
  kind: CollectionKind;
  dateRange: CollectionDateRange;
  onQueryChange: (value: string) => void;
  onKindChange: (value: CollectionKind) => void;
  onDateRangeChange: (range: CollectionDateRange) => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [rangeMode, setRangeMode] = useState(false);
  const filters: Array<[CollectionKind, string]> = [
    ["all", "全部"],
    ["planned", "待出行"],
    ["places", "地点"],
    ["activities", "活动"],
  ];
  const dateLabel =
    dateRange.from && dateRange.to
      ? dateRange.from === dateRange.to
        ? formatReadableDate(dateRange.from)
        : `${formatReadableDate(dateRange.from)} - ${formatReadableDate(dateRange.to)}`
      : "选择日期";
  return (
    <section className="space-y-3">
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.8}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
        />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索地点、活动或关键词"
          className="h-12 w-full rounded-[20px] border border-[#e3ddd4] bg-[#fffaf2]/92 pl-11 pr-4 cn-serif text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(([key, label]) => (
          <TagPill key={key} active={kind === key} onClick={() => onKindChange(key)}>
            {label}
          </TagPill>
        ))}
      </div>
      <div className="rounded-[18px] border border-[#ead8d0] bg-[#fffaf2]/86 px-3 py-2">
        <div className="flex items-center justify-between gap-3 cn-serif text-[12px] text-[var(--ink-soft)]">
          按日期查看
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#ead8d0] bg-white/70 px-3 cn-serif text-[12px] text-[var(--ink)]"
          >
            <CalendarDays size={14} strokeWidth={1.8} />
            {dateLabel}
          </button>
        </div>
      </div>
      {calendarOpen && (
        <CalendarFilterPanel
          range={dateRange}
          rangeMode={rangeMode}
          onRangeModeChange={setRangeMode}
          onChange={onDateRangeChange}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </section>
  );
}

function CalendarFilterPanel({
  range,
  rangeMode,
  onRangeModeChange,
  onChange,
  onClose,
}: {
  range: CollectionDateRange;
  rangeMode: boolean;
  onRangeModeChange: (value: boolean) => void;
  onChange: (range: CollectionDateRange) => void;
  onClose: () => void;
}) {
  const initial = range.from ? new Date(`${range.from}T00:00:00`) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1),
  );
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDay }, () => ""),
    ...Array.from(
      { length: daysInMonth },
      (_, index) =>
        `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
    ),
  ];

  function pickDate(iso: string) {
    if (!rangeMode) {
      onChange({ from: iso, to: iso });
      onClose();
      return;
    }
    if (!range.from || (range.from && range.to)) {
      onChange({ from: iso, to: "" });
      return;
    }
    const next = iso < range.from ? { from: iso, to: range.from } : { from: range.from, to: iso };
    onChange(next);
    onClose();
  }

  return (
    <FlowPanel
      title="按日期筛选收藏"
      description="可以选择某一天，也可以切换成日期范围查看那段时间走过或加入待出行的内容。"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onRangeModeChange(false)}
            className={`min-h-10 rounded-[16px] border cn-serif text-[12px] ${
              !rangeMode
                ? "border-[#f5b8c4] bg-[#fce4ec] text-[var(--ink)]"
                : "border-[#ead8d0] bg-white/62 text-[var(--ink-soft)]"
            }`}
          >
            单日
          </button>
          <button
            onClick={() => onRangeModeChange(true)}
            className={`min-h-10 rounded-[16px] border cn-serif text-[12px] ${
              rangeMode
                ? "border-[#f5b8c4] bg-[#fce4ec] text-[var(--ink)]"
                : "border-[#ead8d0] bg-white/62 text-[var(--ink-soft)]"
            }`}
          >
            日期范围
          </button>
        </div>
        <div className="rounded-[22px] border border-[#ead8d0] bg-white/56 p-3">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ead8d0] bg-white/64 text-[var(--ink)]"
              aria-label="上个月"
            >
              <ChevronRight size={16} strokeWidth={1.8} className="rotate-180" />
            </button>
            <div className="cn-serif text-[15px] text-[var(--ink)]">
              {year} 年 {month + 1} 月
            </div>
            <button
              onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ead8d0] bg-white/64 text-[var(--ink)]"
              aria-label="下个月"
            >
              <ChevronRight size={16} strokeWidth={1.8} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center cn-serif text-[10px] text-[var(--ink-soft)]">
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((iso, index) => {
              const isPicked = iso && (iso === range.from || iso === range.to);
              const isBetween = iso && range.from && range.to && iso > range.from && iso < range.to;
              return iso ? (
                <button
                  key={iso}
                  onClick={() => pickDate(iso)}
                  className={`min-h-10 rounded-[14px] cn-serif text-[12px] transition ${
                    isPicked
                      ? "bg-[#6f5850] text-white"
                      : isBetween
                        ? "bg-[#fce4ec] text-[var(--ink)]"
                        : "bg-[#fffaf2]/72 text-[var(--ink)]"
                  }`}
                >
                  {Number(iso.slice(-2))}
                </button>
              ) : (
                <span key={`blank-${index}`} />
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChange({ from: "", to: "" })}
            className="min-h-10 rounded-[16px] border border-[#ead8d0] bg-white/62 cn-serif text-[12px] text-[var(--ink)]"
          >
            清除日期
          </button>
          <button
            onClick={onClose}
            className="min-h-10 rounded-[16px] bg-[#6f5850] cn-serif text-[12px] text-white"
          >
            完成
          </button>
        </div>
      </div>
    </FlowPanel>
  );
}

function CollectionPage({
  sagas,
  library,
  pendingPlans,
  query,
  kind,
  dateRange,
  onQueryChange,
  onKindChange,
  onDateRangeChange,
  onOpenRoute,
  onCreate,
  onNotify,
  onAddPlan,
}: {
  sagas: ArchivedChapter[];
  library: ReturnType<typeof buildLibrary>;
  pendingPlans: PendingPlan[];
  query: string;
  kind: CollectionKind;
  dateRange: CollectionDateRange;
  onQueryChange: (value: string) => void;
  onKindChange: (value: CollectionKind) => void;
  onDateRangeChange: (range: CollectionDateRange) => void;
  onOpenRoute: (chapter: ArchivedChapter) => void;
  onCreate: () => void;
  onNotify: (message: string) => void;
  onAddPlan: (plan: Omit<PendingPlan, "id" | "createdAt">) => void;
}) {
  const normalized = query.trim().toLowerCase();
  void sagas;
  void onOpenRoute;
  const placeItems = library.places.filter(
    (item) =>
      isDateInRange(item.lastAt, dateRange) &&
      [item.name, item.type, ...item.emotions].join(" ").toLowerCase().includes(normalized),
  );
  const activityItems = library.activities.filter(
    (item) =>
      isDateInRange(item.lastAt, dateRange) &&
      [item.name, item.type, ...item.emotions].join(" ").toLowerCase().includes(normalized),
  );
  const planItems = pendingPlans.filter(
    (item) =>
      isDateInRange(item.createdAt, dateRange) &&
      [item.title, item.subtitle, item.source, ...item.tags]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
  );
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[24px] border border-[#ead8d0] bg-[#fffaf2]/94 p-4">
        {/* 集章本封面：右上角红色印章 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-2 top-3 rotate-[14deg] select-none rounded-[8px] border-[2px] border-[#c0463a] px-2.5 py-1 cn-serif text-[10px] font-semibold tracking-[0.18em] text-[#c0463a] opacity-80"
          style={{ fontFamily: "'Noto Serif SC', serif" }}
        >
          素 材 库
        </div>
        <div className="cn-serif text-[10.5px] tracking-[0.32em] text-[var(--ink-soft)]">
          STAMP · LIBRARY
        </div>
        <h1 className="mt-1 cn-serif text-[20px] text-[var(--ink)]">收藏的章子</h1>
        <p className="mt-1 cn-serif text-[12px] text-[var(--ink-soft)]">
          地点、活动、想去的清单——每一枚都可以盖到下一段路线里。
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "地点", count: library.places.length, tone: "#c0463a" },
            { label: "活动", count: library.activities.length, tone: "#5a7a4a" },
            { label: "待出行", count: pendingPlans.length, tone: "#8a5a2a" },
          ].map((stamp) => (
            <div
              key={stamp.label}
              className="relative flex flex-col items-center justify-center rounded-[14px] border-[1.5px] border-dashed bg-white/55 px-2 py-2.5"
              style={{ borderColor: `${stamp.tone}55` }}
            >
              <div
                className="cn-serif text-[20px] font-semibold leading-none"
                style={{ color: stamp.tone, fontFamily: "'Noto Serif SC', serif" }}
              >
                {stamp.count}
              </div>
              <div
                className="mt-1 cn-serif text-[10.5px] tracking-[0.18em]"
                style={{ color: stamp.tone }}
              >
                {stamp.label}
              </div>
            </div>
          ))}
        </div>
      </section>
      <CollectionSearch
        query={query}
        kind={kind}
        dateRange={dateRange}
        onQueryChange={onQueryChange}
        onKindChange={onKindChange}
        onDateRangeChange={onDateRangeChange}
      />
      <section className="space-y-3">
        {(kind === "all" || kind === "planned") &&
          (planItems.length > 0
            ? planItems
                .slice(0, kind === "all" ? 2 : 20)
                .map((plan) => <PendingPlanCard key={plan.id} plan={plan} onNotify={onNotify} />)
            : kind === "planned" && (
                <div className="rounded-[22px] border border-dashed border-[#ead8d0] bg-[#fffaf2]/70 p-5 text-center">
                  <div className="cn-serif text-[14px] text-[var(--ink)]">还没有待出行内容</div>
                  <p className="mt-1 cn-serif text-[12px] text-[var(--ink-soft)]">
                    在生成页或路线时间线里点击加入待出行后，会出现在这里。
                  </p>
                </div>
              ))}
        {/* 路线数据移到「路线」tab，素材库只保留可复用的地点/活动/待出行 */}
        {(kind === "all" || kind === "places") &&
          placeItems.slice(0, kind === "all" ? 3 : 20).map((entry) => (
            <CollectionAssetCard
              key={`place-${entry.name}`}
              entry={entry}
              kind="地点"
              onOpen={() => onNotify("已打开地点记录")}
              onAction={() =>
                onAddPlan({
                  title: entry.name,
                  subtitle: `${entry.type} · 来自收藏地点`,
                  source: "收藏地点",
                  tags: [entry.type, ...entry.emotions.slice(0, 2)],
                })
              }
            />
          ))}
        {(kind === "all" || kind === "activities") &&
          activityItems.slice(0, kind === "all" ? 3 : 20).map((entry) => (
            <CollectionAssetCard
              key={`activity-${entry.name}`}
              entry={entry}
              kind="活动"
              onOpen={() => onNotify("已打开活动来源")}
              onAction={() =>
                onAddPlan({
                  title: entry.name,
                  subtitle: `${entry.type} · 来自活动收藏`,
                  source: "活动收藏",
                  tags: [entry.type, ...entry.emotions.slice(0, 2)],
                })
              }
            />
          ))}
      </section>
      <PrimaryActionButton onClick={onCreate} icon={<Plus size={17} strokeWidth={1.8} />}>
        新建路线
      </PrimaryActionButton>
    </div>
  );
}

function CollectionAssetCard({
  entry,
  kind,
  onOpen,
  onAction,
}: {
  entry: LibraryEntry;
  kind: "地点" | "活动";
  onOpen: () => void;
  onAction: () => void;
}) {
  const [panel, setPanel] = useState<"record" | "action" | null>(null);
  const lastDate = entry.lastAt ? formatArchiveDate(entry.lastAt) : "最近";
  return (
    <article className="relative overflow-hidden rounded-[20px] border border-[#ead8d0] bg-[#fffaf2]/92 p-3">
      {/* 收藏盖章印记 */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-2 top-2 rotate-[-8deg] select-none rounded-[6px] border-[1.5px] px-1.5 py-0.5 cn-serif text-[9px] tracking-[0.14em] opacity-75"
        style={{
          borderColor: kind === "地点" ? "#c0463a" : "#5a7a4a",
          color: kind === "地点" ? "#c0463a" : "#5a7a4a",
          fontFamily: "'Noto Serif SC', serif",
        }}
      >
        {kind === "地点" ? "已收藏" : "再安排"} · {lastDate}
      </div>
      {panel === "record" && (
        <FlowPanel
          title={`${entry.name} · 来源记录`}
          description="这里展示这个资产来自哪些历史记录，以及为什么它可以继续复用。"
          onClose={() => setPanel(null)}
        >
          <div className="grid gap-2">
            <div className="rounded-[18px] border border-[#ead8d0] bg-white/62 p-3">
              <div className="cn-serif text-[13px] text-[var(--ink)]">资产来源</div>
              <p className="mt-1 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
                最近访问：{lastDate} · 访问 {entry.visits} 次 · 类型：{entry.type}
              </p>
            </div>
            <div className="rounded-[18px] border border-[#ead8d0] bg-white/62 p-3">
              <div className="cn-serif text-[13px] text-[var(--ink)]">可复用标签</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(entry.emotions.length ? entry.emotions : ["可复用", "可再次安排"]).map((tag) => (
                  <TagPill key={tag}>{tag}</TagPill>
                ))}
              </div>
            </div>
          </div>
        </FlowPanel>
      )}
      {panel === "action" && (
        <FlowPanel
          title={kind === "地点" ? "加入下次路线" : "再次安排活动"}
          description="选择这条收藏资产下一步要怎么使用。"
          onClose={() => setPanel(null)}
        >
          <div className="grid gap-2">
            {(kind === "地点"
              ? ["加入待规划路线", "设为收尾点", "生成相似地点"]
              : ["加入待出行", "替换为相似活动", "生成活动提醒"]
            ).map((item) => (
              <button
                key={item}
                onClick={() => {
                  onAction();
                  setPanel(null);
                }}
                className="min-h-11 rounded-[16px] border border-[#ead8d0] bg-white/66 cn-serif text-[13px] text-[var(--ink)]"
              >
                {item}
              </button>
            ))}
          </div>
        </FlowPanel>
      )}
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[#fff4ec] text-[#8f5f68]">
          {kind === "地点" ? (
            <VenueIcon kind={detectVenue(entry.type, entry.name)} size={54} />
          ) : (
            <Sparkles size={27} strokeWidth={1.7} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate cn-serif text-[15px] text-[var(--ink)]">{entry.name}</h3>
          <div className="mt-1 cn-serif text-[11px] text-[var(--ink-soft)]">
            {entry.type} · 访问 {entry.visits} 次 · 最近 {lastDate}
          </div>
          <div className="mt-1 cn-serif text-[10.5px] text-[var(--ink-soft)]">
            关联路线：{Math.max(1, entry.visits)} 条 · 完善度 {Math.min(5, entry.level || 1)}/5
          </div>
        </div>
        <MoreHorizontal size={17} strokeWidth={1.7} className="text-[var(--ink-soft)]" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setPanel("record")}
          className="min-h-9 rounded-[15px] border border-[#ead8d0] bg-white/62 cn-serif text-[11px] text-[var(--ink)]"
        >
          查看记录
        </button>
        <button
          onClick={() => setPanel("action")}
          className="min-h-9 rounded-[15px] bg-[#6f5850] cn-serif text-[11px] text-white"
        >
          {kind === "地点" ? "加入路线" : "再次安排"}
        </button>
      </div>
    </article>
  );
}

function PendingPlanCard({
  plan,
  onNotify,
}: {
  plan: PendingPlan;
  onNotify: (message: string) => void;
}) {
  return (
    <article className="overflow-hidden rounded-[22px] border border-[#ead8d0] bg-[linear-gradient(135deg,#fffaf2_0%,#fdf0f5_60%,#f8eef2_100%)] p-4 shadow-[0_18px_52px_-44px_rgba(61,53,48,0.42)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex rounded-full border border-white/70 bg-white/58 px-2.5 py-1 cn-serif text-[10px] text-[#8f5f68]">
            待出行 · {plan.source}
          </div>
          <h3 className="mt-2 cn-serif text-[17px] leading-snug text-[var(--ink)]">{plan.title}</h3>
          <p className="mt-1 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
            {plan.subtitle}
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/58 text-[#6f5850]">
          <Clock3 size={22} strokeWidth={1.7} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {plan.tags.slice(0, 4).map((tag) => (
          <TagPill key={tag}>{tag}</TagPill>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onNotify("已打开待出行详情")}
          className="min-h-9 rounded-[15px] border border-white/80 bg-white/60 cn-serif text-[11px] text-[var(--ink)]"
        >
          查看计划
        </button>
        <button
          onClick={() => onNotify("已开始规划这次出行")}
          className="min-h-9 rounded-[15px] bg-[#6f5850] cn-serif text-[11px] text-white"
        >
          开始规划
        </button>
      </div>
    </article>
  );
}

function ProfileInsights({
  profile,
  memory,
  rangeLabel,
}: {
  profile: ReturnType<typeof buildCityPreferenceProfile>;
  memory: DmMemorySnapshot | null;
  rangeLabel: string;
}) {
  const conclusions = [
    profile.persona || "偏好清幽自然与花草气息",
    profile.trendSummary || "常探索城市的人文与小众角落",
    `周末出行更规律，${profile.topCities?.[0] ?? memory?.profile ?? "深圳"} 最活跃`,
  ].slice(0, 3);
  const metrics = [
    { value: profile.periodStats.totalRoutes || 13, label: `${rangeLabel}出行` },
    { value: profile.periodStats.weekendRoutes || 6, label: "周末出行" },
    { value: profile.periodStats.completedNodes || 40, label: "节点累计" },
    { value: profile.topCities?.length || 5, label: "城市" },
  ];
  const insightIcons = [
    <Sparkles key="sparkles" size={18} strokeWidth={1.7} />,
    <MapPinned key="map" size={18} strokeWidth={1.7} />,
    <Clock3 key="clock" size={18} strokeWidth={1.7} />,
  ];
  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#fffaf2_0%,#f6eee8_42%,#fff4ec_100%)] p-5 shadow-[0_24px_70px_-52px_rgba(61,53,48,0.5)]">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#f3dde4]/38 blur-2xl" />
        <div className="absolute -bottom-10 left-8 h-28 w-28 rounded-full bg-[#fce4ec]/60 blur-2xl" />
        <div className="relative">
          <div className="display text-[10px] tracking-[0.34em] text-[#6f5850]">CITY PROFILE</div>
          <h1 className="mt-2 cn-serif text-[24px] leading-tight text-[var(--ink)]">长期画像</h1>
          <p className="mt-2 max-w-[30em] cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
            先给你一句可以带走的结论，再把依据和数据藏在下面。
          </p>
        </div>
      </section>
      <section className="rounded-[26px] border border-[#ead8d0] bg-[#fffaf2]/92 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="cn-serif text-[16px] text-[var(--ink)]">你的核心结论</div>
            <div className="mt-0.5 cn-serif text-[11px] text-[var(--ink-soft)]">
              可以截图分享的城市偏好摘要
            </div>
          </div>
          <div className="rounded-full bg-[#fff4ec] px-3 py-1 cn-serif text-[10px] text-[#8f5f68]">
            3 条洞察
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {conclusions.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className={`relative overflow-hidden rounded-[22px] border border-white/72 p-4 shadow-[0_16px_44px_-38px_rgba(61,53,48,0.5)] ${
                index === 0
                  ? "bg-[linear-gradient(135deg,#f8eef2_0%,#fffaf2_72%)]"
                  : index === 1
                    ? "bg-[linear-gradient(135deg,#fdf0f5_0%,#fffaf2_76%)]"
                    : "bg-[linear-gradient(135deg,#f1edf8_0%,#fffaf2_76%)]"
              }`}
            >
              <div className="absolute right-3 top-3 display text-[34px] leading-none text-white/70">
                0{index + 1}
              </div>
              <div className="relative flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/64 text-[#8f5f68]">
                  {insightIcons[index]}
                </div>
                <p className="pr-8 cn-serif text-[14px] leading-relaxed text-[var(--ink)]">
                  {item}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-[26px] border border-[#ead8d0] bg-[#fffaf2]/92 p-4">
        <div className="cn-serif text-[16px] text-[var(--ink)]">依据与数据</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={`rounded-[20px] border border-white/70 px-3 py-3 ${
                index === 0
                  ? "bg-[#f4eef2]"
                  : index === 1
                    ? "bg-[#fff4ec]"
                    : index === 2
                      ? "bg-[#f7f0ea]"
                      : "bg-[#f2f0f7]"
              }`}
            >
              <div className="display text-[26px] leading-none text-[#5f5953]">{metric.value}</div>
              <div className="mt-1 cn-serif text-[11px] text-[var(--ink-soft)]">{metric.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-[18px] border border-[#e7ded4] bg-white/58 px-3 py-2 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
          {profile.paceReason || "依据来自已完成路线、地点类型、情绪关键词和城市分布。"}
        </div>
      </section>
      <section className="rounded-[26px] border border-[#ead8d0] bg-[#fffaf2]/92 p-4">
        <div className="cn-serif text-[16px] text-[var(--ink)]">高频关键词</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ...(profile.topCategories ?? []),
            ...(profile.emotionTags ?? []),
            ...(profile.topDistricts ?? []),
          ]
            .filter(Boolean)
            .slice(0, 12)
            .map((tag) => (
              <TagPill key={tag}>{tag}</TagPill>
            ))}
        </div>
      </section>
    </div>
  );
}

function ProfilePage({
  profile,
  memory,
  sagas,
  rangeKey,
  rangeLabel,
  onRangeChange,
  onGenerate,
  onNotify,
}: {
  profile: ReturnType<typeof buildCityPreferenceProfile>;
  memory: DmMemorySnapshot | null;
  sagas: ArchivedChapter[];
  rangeKey: RangeKey;
  rangeLabel: string;
  onRangeChange: (range: RangeKey) => void;
  onGenerate: () => void;
  onNotify: (message: string) => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  return (
    <div className="space-y-5">
      {detailOpen && (
        <FlowPanel
          title="数据与明细"
          description="这里展示画像结论背后的来源，不跳到生成页。"
          onClose={() => setDetailOpen(false)}
        >
          <div className="grid gap-3">
            <div className="rounded-[18px] border border-[#ead8d0] bg-white/62 p-3">
              <div className="cn-serif text-[13px] text-[var(--ink)]">周期摘要</div>
              <p className="mt-1 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
                {profile.periodStats.summary}
              </p>
            </div>
            <div className="rounded-[18px] border border-[#ead8d0] bg-white/62 p-3">
              <div className="cn-serif text-[13px] text-[var(--ink)]">城市分布</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(profile.periodStats.cityStats.length
                  ? profile.periodStats.cityStats
                  : ["暂无城市明细"]
                ).map((item) => (
                  <TagPill key={item}>{item}</TagPill>
                ))}
              </div>
            </div>
            <div className="rounded-[18px] border border-[#ead8d0] bg-white/62 p-3">
              <div className="cn-serif text-[13px] text-[var(--ink)]">推荐依据</div>
              <div className="mt-2 grid gap-1.5">
                {(profile.recommendationProof.length
                  ? profile.recommendationProof
                  : ["继续完成路线后生成更多依据"]
                ).map((item) => (
                  <p key={item} className="cn-serif text-[12px] text-[var(--ink-soft)]">
                    · {item}
                  </p>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                setDetailOpen(false);
                onGenerate();
              }}
              className="min-h-11 rounded-[16px] border border-[#ead8d0] bg-white/66 cn-serif text-[13px] text-[var(--ink)]"
            >
              基于这些画像去生成路线
            </button>
          </div>
        </FlowPanel>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["30d", "30天"],
            ["90d", "90天"],
            ["year", "1年"],
            ["all", "全部"],
          ] as const
        ).map(([key, label]) => (
          <TagPill key={key} active={rangeKey === key} onClick={() => onRangeChange(key)}>
            {label}
          </TagPill>
        ))}
      </div>
      <ProfileInsights profile={profile} memory={memory} rangeLabel={rangeLabel} />
      <ProfilePosterCollection sagas={sagas} onNotify={onNotify} />
      <PrimaryActionButton
        onClick={() => setDetailOpen(true)}
        icon={<FileText size={17} strokeWidth={1.8} />}
      >
        查看更多数据与明细
      </PrimaryActionButton>
    </div>
  );
}

function ProfilePosterCollection({
  sagas,
  onNotify,
}: {
  sagas: ArchivedChapter[];
  onNotify: (message: string) => void;
}) {
  const bookletExportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportReady, setExportReady] = useState<ExportReadyState>(null);
  const sorted = useMemo(
    () => [...sagas].sort((a, b) => (b.archivedAt ?? b.createdAt) - (a.archivedAt ?? a.createdAt)),
    [sagas],
  );

  async function exportBooklet() {
    const el = bookletExportRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const blob = await elementToPdfBlob(el);
      const filename = `我的连载_复盘海报小册_${formatIsoDate(Date.now())}.pdf`;
      const url = await downloadBlob(blob, filename);
      setExportReady({
        url,
        filename,
        title: "复盘小册 PDF 已生成",
        description: "如果当前预览浏览器没有自动下载，请点击下面的文件入口打开或保存。",
      });
      onNotify("复盘海报小册 PDF 已生成");
    } catch (error) {
      onNotify("导出失败：" + (error as Error).message);
    } finally {
      setExporting(false);
    }
  }

  if (!sorted.length) return null;

  return (
    <section className="rounded-[28px] border border-[#ead8d0] bg-[#fffaf2]/92 p-4">
      {exportReady && (
        <ExportReadyPanel exportReady={exportReady} onClose={() => setExportReady(null)} />
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="display text-[10px] tracking-[0.32em] text-[#8f5f68]">POSTER BOOKLET</div>
          <h2 className="mt-1 cn-serif text-[18px] text-[var(--ink)]">复盘海报合集</h2>
          <p className="mt-1 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
            按时间收起每一次出行的复盘海报，积累一段时间后可以导出成一本小册子。
          </p>
        </div>
        <button
          onClick={exportBooklet}
          disabled={exporting}
          className="shrink-0 rounded-full bg-[#8f6c62] px-3 py-2 cn-serif text-[11px] text-white shadow-[0_12px_28px_-22px_rgba(61,53,48,0.48)] disabled:opacity-50"
        >
          {exporting ? "导出中" : "导出 PDF"}
        </button>
      </div>

      <div className="mt-4 space-y-3 rounded-[22px] bg-[#fffaf2] p-2">
        {sorted.map((chapter, index) => (
          <BookletPosterCard
            key={chapter.chapterId}
            chapter={chapter}
            chapterNo={sorted.length - index}
          />
        ))}
      </div>
      <div
        ref={bookletExportRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-[-99999px] top-0 w-[794px] bg-[#fffaf2] text-[var(--ink)]"
      >
        <BookletExportDocument chapters={sorted} />
      </div>
    </section>
  );
}

function BookletPosterCard({
  chapter,
  chapterNo,
}: {
  chapter: ArchivedChapter;
  chapterNo: number;
}) {
  const image = imageForChapter(chapter);
  const scenes = completedScenes(chapter);
  const { done, total, pct } = routeCompletion(chapter);
  return (
    <article className="relative min-h-[210px] overflow-hidden rounded-[24px] border border-white/75 bg-[#fdf0f5] shadow-[0_18px_46px_-40px_rgba(61,53,48,0.55)]">
      {image ? (
        <img
          src={image}
          alt={chapter.card.identity}
          className="absolute inset-0 h-full w-full object-cover [filter:saturate(1.1)_brightness(1.06)_sepia(0.06)]"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${chapter.card.colors[0]}, ${chapter.card.colors[1]})`,
          }}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(72,44,38,0.66)_0%,rgba(112,67,56,0.36)_50%,rgba(255,244,236,0.22)_100%)]" />
      <div className="relative flex min-h-[210px] flex-col justify-end p-4 text-white">
        <div className="mb-auto flex items-center justify-between">
          <span className="rounded-full border border-white/28 bg-white/18 px-2.5 py-1 cn-serif text-[10px] backdrop-blur">
            CH.{String(chapterNo).padStart(2, "0")}
          </span>
          <span className="rounded-full border border-white/28 bg-white/18 px-2.5 py-1 cn-serif text-[10px] backdrop-blur">
            {formatArchiveDate(chapter.createdAt)}
          </span>
        </div>
        <div className="max-w-[88%]">
          <div className="cn-serif text-[11px] text-white/82">
            {chapter.city || "城市"} · 复盘海报
          </div>
          <h3 className="mt-1 cn-serif text-[21px] leading-tight drop-shadow">
            {chapter.card.identity}
          </h3>
          <div className="mt-3 grid max-w-[260px] grid-cols-3 gap-1.5">
            {[
              [`${pct}%`, "完成度"],
              [`${done}/${total}`, "地点"],
              [`${scenes.length}`, "时间线"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-[14px] border border-white/26 bg-white/18 px-2 py-2 text-center backdrop-blur"
              >
                <div className="display text-[16px] leading-none">{value}</div>
                <div className="mt-0.5 cn-serif text-[9px] text-white/78">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {scenes.slice(0, 3).map((scene) => (
              <span
                key={scene.order}
                className="rounded-full border border-white/26 bg-white/18 px-2 py-1 cn-serif text-[9.5px] text-white/86 backdrop-blur"
              >
                {scene.scene_name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function BookletExportDocument({ chapters }: { chapters: ArchivedChapter[] }) {
  const newest = chapters[0];
  const totalScenes = chapters.reduce((sum, chapter) => sum + completedScenes(chapter).length, 0);
  const cities = Array.from(new Set(chapters.map((chapter) => chapter.city).filter(Boolean)));

  return (
    <div className="w-[794px] bg-[#fffaf2] cn-serif text-[#6f5850]">
      <BookletCoverPage
        chapters={chapters}
        newest={newest}
        totalScenes={totalScenes}
        cityCount={cities.length}
      />
      <BookletTocPage chapters={chapters} />
      {chapters.map((chapter, index) => (
        <BookletRoutePosterPage
          key={chapter.chapterId}
          chapter={chapter}
          chapterNo={chapters.length - index}
        />
      ))}
    </div>
  );
}

function BookletPageShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative h-[1123px] w-[794px] overflow-hidden bg-[#fffaf2] p-10 ${className}`}
      style={{ breakAfter: "page" }}
    >
      {children}
    </section>
  );
}

function BookletCoverPage({
  chapters,
  newest,
  totalScenes,
  cityCount,
}: {
  chapters: ArchivedChapter[];
  newest?: ArchivedChapter;
  totalScenes: number;
  cityCount: number;
}) {
  const cover = imageForChapter(newest);
  return (
    <BookletPageShell className="bg-[linear-gradient(145deg,#fff8ed_0%,#fdeef4_48%,#fff6df_100%)]">
      {cover && (
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-28 [filter:saturate(1.16)_brightness(1.1)_sepia(0.08)]"
        />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.86)_0%,rgba(255,250,242,0.42)_32%,rgba(255,250,242,0)_60%),linear-gradient(180deg,rgba(255,250,242,0.38)_0%,rgba(255,250,242,0.98)_82%)]" />
      <div className="relative flex h-full flex-col">
        <div className="display text-[12px] tracking-[0.38em] text-[#9d6d78]">MY ARCHIVE</div>
        <div className="mt-48">
          <div className="inline-flex rounded-full border border-[#ead8d0] bg-white/62 px-4 py-2 text-[14px] text-[#8f5f68] shadow-[0_18px_44px_-36px_rgba(61,53,48,0.5)]">
            复盘海报小册
          </div>
          <h1 className="mt-7 text-[52px] leading-tight tracking-[0] text-[#5f4d48]">我的连载</h1>
          <p className="mt-5 max-w-[520px] text-[21px] leading-relaxed text-[#7b665f]">
            把每一次路线复盘收成册页，留下城市、时间线和当时的自己。
          </p>
        </div>
        <div className="mt-auto grid grid-cols-3 gap-4">
          {[
            [`${chapters.length}`, "路线复盘"],
            [`${totalScenes}`, "完成地点"],
            [`${cityCount || 1}`, "记录城市"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="rounded-[24px] border border-white/76 bg-white/66 px-5 py-5 shadow-[0_20px_50px_-42px_rgba(61,53,48,0.5)] backdrop-blur"
            >
              <div className="display text-[34px] leading-none text-[#8f5f68]">{value}</div>
              <div className="mt-2 text-[15px] text-[#7b665f]">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-[#ead8d0] pt-5 text-[13px] text-[#8a746c]">
          <span>{formatArchiveDate(Date.now())}</span>
          <span>{newest?.city || "城市"} · Fairy Weekend</span>
        </div>
      </div>
    </BookletPageShell>
  );
}

function BookletTocPage({ chapters }: { chapters: ArchivedChapter[] }) {
  return (
    <BookletPageShell className="bg-[linear-gradient(180deg,#fffaf2_0%,#fff4f0_100%)]">
      <div className="display text-[12px] tracking-[0.38em] text-[#9d6d78]">CONTENTS</div>
      <h2 className="mt-5 text-[42px] leading-tight text-[#5f4d48]">目录</h2>
      <p className="mt-4 max-w-[560px] text-[18px] leading-relaxed text-[#7b665f]">
        每一页都是一次路线的复盘海报，按最近完成时间排序。
      </p>
      <div className="mt-12 space-y-4">
        {chapters.map((chapter, index) => {
          const scenes = completedScenes(chapter);
          return (
            <div
              key={chapter.chapterId}
              className="grid grid-cols-[86px_1fr_64px] items-center gap-5 rounded-[24px] border border-[#ead8d0] bg-white/64 px-5 py-4 shadow-[0_18px_46px_-42px_rgba(61,53,48,0.45)]"
            >
              <div className="display text-[19px] text-[#8f5f68]">
                CH.{String(chapters.length - index).padStart(2, "0")}
              </div>
              <div>
                <div className="text-[20px] leading-snug text-[#5f4d48]">
                  {chapter.card.identity}
                </div>
                <div className="mt-1 text-[13px] text-[#8a746c]">
                  {chapter.city || "城市"} · {formatArchiveDate(chapter.createdAt)} ·{" "}
                  {scenes.length} 个时间点
                </div>
              </div>
              <div className="text-right display text-[15px] text-[#b28a75]">
                {String(index + 3).padStart(2, "0")}
              </div>
            </div>
          );
        })}
      </div>
    </BookletPageShell>
  );
}

function BookletRoutePosterPage({
  chapter,
  chapterNo,
}: {
  chapter: ArchivedChapter;
  chapterNo: number;
}) {
  const privacy = loadPostchainPrivacy();
  const authLevel = loadPostchainAuth() ?? "basic";
  const report = buildPostchainReport(chapter, { authLevel, reportStyle: "literary", privacy });
  const coverPhoto = report.photoUrls[0] || imageForChapter(chapter);
  const poemLines = buildThreeLinePoem(report);
  const shareText = naturalShareText(chapter, report);
  const timelineScenes = completedScenes(chapter).slice(0, 4);

  return (
    <BookletPageShell>
      <div
        className="relative h-full overflow-hidden rounded-[34px] border border-white/78 bg-[#fff8ed] shadow-[0_34px_90px_-64px_rgba(61,53,48,0.68)]"
        style={
          coverPhoto
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(72,44,38,0.14) 0%, rgba(72,44,38,0.48) 38%, rgba(255,244,236,0.94) 70%, rgba(255,250,242,0.99) 100%), url(${coverPhoto})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
              }
            : {
                background: `linear-gradient(180deg, rgba(255,244,236,0.22) 0%, rgba(255,250,242,0.98) 70%), linear-gradient(135deg, ${chapter.card.colors[0]}, ${chapter.card.colors[1]})`,
              }
        }
      >
        <div className="flex h-full flex-col p-7">
          <div className="min-h-[386px] rounded-[30px] border border-white/28 bg-white/10 p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-full border border-white/32 bg-white/20 px-4 py-2 text-[13px] backdrop-blur">
                CH.{String(chapterNo).padStart(2, "0")} · {formatArchiveDate(chapter.createdAt)}
              </div>
              <div className="rounded-full border border-white/32 bg-white/20 px-4 py-2 text-[13px] backdrop-blur">
                复盘海报
              </div>
            </div>
            <div className="mt-36 max-w-[560px]">
              <div className="text-[15px] text-white/84">
                {privacy.showLocation && chapter.city ? chapter.city : "城市路线"} · 路线复盘
              </div>
              <h3 className="mt-3 text-[42px] leading-tight text-white drop-shadow">
                {report.identityBadge}
              </h3>
              <div className="mt-5 grid max-w-[430px] grid-cols-3 gap-2.5">
                {[
                  [`${Math.round(report.completionRate * 100)}%`, "完成度"],
                  [`${report.completedNodes.length}`, "完成地点"],
                  [`${timelineScenes.length}`, "时间段"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-[20px] border border-white/30 bg-white/22 px-3 py-3 text-center backdrop-blur"
                  >
                    <div className="display text-[25px] leading-none text-white">{value}</div>
                    <div className="mt-1 text-[12px] text-white/82">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex-1 rounded-[30px] border border-white/80 bg-[#fffaf2]/90 p-6 shadow-[0_22px_58px_-46px_rgba(61,53,48,0.66)] backdrop-blur">
            <div className="grid grid-cols-[1fr_1.15fr] gap-5">
              <div>
                <div className="text-[15px] text-[#8f5f68]">三行诗</div>
                <div className="mt-3 space-y-2">
                  {poemLines.map((line, index) => (
                    <p
                      key={`${line}-${index}`}
                      className="text-[20px] leading-relaxed text-[#5f4d48]"
                    >
                      {line}
                    </p>
                  ))}
                </div>
                <div className="mt-6 rounded-[24px] border border-[#ead8d0] bg-white/60 p-4">
                  <div className="text-[15px] text-[#8f5f68]">今日总结</div>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#6f5850]">{shareText}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#ead8d0] bg-white/54 p-4">
                <div className="text-[15px] text-[#8f5f68]">路线时间线</div>
                <div className="mt-4 space-y-4">
                  {timelineScenes.map((scene, index) => {
                    const rec = chapter.sceneRecords?.[scene.order];
                    const completedAt = rec?.completedAt ? new Date(rec.completedAt) : null;
                    const timeLabel = completedAt
                      ? `${String(completedAt.getHours()).padStart(2, "0")}:${String(completedAt.getMinutes()).padStart(2, "0")}`
                      : index === 0
                        ? "08:30"
                        : index === 1
                          ? "12:00"
                          : index === 2
                            ? "15:30"
                            : "18:30";
                    return (
                      <div key={scene.order} className="grid grid-cols-[58px_1fr] gap-4">
                        <div className="pt-0.5 text-[14px] text-[#9d6d78]">{timeLabel}</div>
                        <div className="border-l border-[#e0c8c1] pl-4">
                          <div className="text-[17px] leading-snug text-[#5f4d48]">
                            {scene.scene_name}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[#806b64]">
                            {rec?.note || scene.persona_narrative}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BookletPageShell>
  );
}

function RecommendationRouteCard({
  profile,
  latestChapter,
  variantIndex,
  onGenerate,
  onShuffle,
}: {
  profile: ReturnType<typeof buildCityPreferenceProfile>;
  latestChapter: ArchivedChapter | null;
  variantIndex: number;
  onGenerate: () => void;
  onShuffle: () => void;
}) {
  const fallbackTitles = ["绿意与旧巷的慢时光", "花市、咖啡与城市缓行", "自然边角里的半日漫游"];
  const title = profile.nextRouteBrief || fallbackTitles[variantIndex % fallbackTitles.length];
  const city = latestChapter?.city || profile.topCities?.[0] || "深圳";
  const image = imageForChapter(latestChapter);
  const tags = [
    ...(profile.topCategories ?? []),
    ...(profile.emotionTags ?? []),
    ...(profile.topDistricts ?? []),
  ]
    .filter(Boolean)
    .slice(0, 5);
  const highlights = [
    profile.nextRecommendationReason || "城市绿意与旧巷交织，治愈感强。",
    profile.recommendationProof?.[0] || "三个小众地点，步行可达。",
    profile.recommendationProof?.[1] || "适合周末半日漫游。",
  ];
  return (
    <section className="overflow-hidden rounded-[24px] border border-[#ead8d0] bg-[#fffaf2]/94">
      <div className="relative h-48 bg-[#fff4ec]">
        {image ? (
          <img
            src={image}
            alt={title}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,#fce4ec,#f8eef2_58%,#fffaf2)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/10 to-transparent" />
        <div className="absolute left-4 top-4 rounded-full bg-[#fff4ec] px-3 py-1 cn-serif text-[11px] text-[#7f4f5c]">
          推荐
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h2 className="cn-serif text-[22px] leading-tight">{title}</h2>
          <div className="mt-1 cn-serif text-[12px] opacity-86">{city} · 2026.06.07 · 3/3 地点</div>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <TagPill key={tag}>{tag}</TagPill>
          ))}
        </div>
        <div className="cn-serif text-[14px] text-[var(--ink)]">路线亮点</div>
        <ul className="mt-2 grid gap-1.5">
          {highlights.map((item) => (
            <li key={item} className="cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
              · {item}
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
          <PrimaryActionButton
            onClick={onGenerate}
            icon={<WandSparkles size={17} strokeWidth={1.8} />}
          >
            生成路线
          </PrimaryActionButton>
          <button
            onClick={onShuffle}
            className="min-h-10 w-full rounded-[16px] border border-[#ead8d0] bg-white/56 cn-serif text-[12px] text-[var(--ink)]"
          >
            换一条推荐
          </button>
        </div>
      </div>
    </section>
  );
}

function GeneratePage({
  profile,
  latestChapter,
  onGo,
  onNotify,
  onAddPlan,
}: {
  profile: ReturnType<typeof buildCityPreferenceProfile>;
  latestChapter: ArchivedChapter | null;
  onGo: () => void;
  onNotify: (message: string) => void;
  onAddPlan: (plan: Omit<PendingPlan, "id" | "createdAt">) => void;
}) {
  const [variantIndex, setVariantIndex] = useState(0);
  const [generatedOpen, setGeneratedOpen] = useState(false);
  const tags = [
    ...(profile.topCategories ?? []),
    ...(profile.emotionTags ?? []),
    ...(profile.topDistricts ?? []),
  ]
    .filter(Boolean)
    .slice(0, 4);
  return (
    <div className="space-y-5">
      {generatedOpen && (
        <FlowPanel
          title="已生成推荐路线"
          description="这不是静态按钮，路线已经进入待出行流程，可以继续查看或加入计划。"
          onClose={() => setGeneratedOpen(false)}
        >
          <div className="grid gap-3">
            {["上午 · 竹影与城市绿地", "午后 · 小众咖啡与香料", "傍晚 · 花市收尾"].map(
              (item, index) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-[#ead8d0] bg-white/62 px-3 py-3"
                >
                  <div className="cn-serif text-[13px] text-[var(--ink)]">{item}</div>
                  <div className="mt-1 cn-serif text-[11px] text-[var(--ink-soft)]">
                    STEP {index + 1} · 可替换地点 · 步行可达
                  </div>
                </div>
              ),
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  onAddPlan({
                    title: profile.nextRouteBrief || "绿意与旧巷的慢时光",
                    subtitle: "来自生成推荐路线 · 3 个地点",
                    source: "生成路线",
                    tags: [...(profile.topCategories ?? []), ...(profile.emotionTags ?? [])].slice(
                      0,
                      4,
                    ),
                  })
                }
                className="min-h-11 rounded-[16px] border border-[#ead8d0] bg-white/66 cn-serif text-[12px] text-[var(--ink)]"
              >
                加入待出行
              </button>
              <button
                onClick={onGo}
                className="min-h-11 rounded-[16px] bg-[#6f5850] cn-serif text-[12px] text-white"
              >
                查看路线详情
              </button>
            </div>
          </div>
        </FlowPanel>
      )}
      <section className="rounded-[24px] border border-[#ead8d0] bg-[#fffaf2]/94 p-4">
        <h1 className="cn-serif text-[20px] text-[var(--ink)]">生成推荐路线</h1>
        <p className="mt-1 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
          基于你的偏好，为你生成下一条推荐路线。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(tags.length ? tags : ["自然", "花草", "城市漫步", "小众店铺"]).map((tag) => (
            <TagPill key={tag}>{tag}</TagPill>
          ))}
        </div>
      </section>
      <RecommendationRouteCard
        profile={profile}
        latestChapter={latestChapter}
        variantIndex={variantIndex}
        onGenerate={() => {
          setGeneratedOpen(true);
          onNotify("已生成路线");
        }}
        onShuffle={() => {
          setVariantIndex((value) => value + 1);
          onNotify("已换一条推荐");
        }}
      />
    </div>
  );
}

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div className="fixed inset-x-0 bottom-6 z-[120] mx-auto flex max-w-xl justify-center px-5">
      <div className="rounded-full border border-[#ead8d0] bg-[#fffaf2]/95 px-4 py-2 cn-serif text-[12px] text-[var(--ink)] shadow-[0_18px_44px_-28px_rgba(61,53,48,0.7)] backdrop-blur">
        {toast.message}
      </div>
    </div>
  );
}

function ReuseRouteDialog({
  title,
  onClose,
  onGo,
  onNotify,
}: {
  title: string;
  onClose: () => void;
  onGo: () => void;
  onNotify: (message: string) => void;
}) {
  const actions = [
    { label: "原样复刻", feedback: "已生成原样路线", go: true },
    { label: "按今天时间重新规划", feedback: "已按今天时间重新规划", go: true },
    { label: "替换部分地点", feedback: "请选择要替换的地点" },
    { label: "加入待出行", feedback: "已加入待出行" },
    { label: "生成分享链接", feedback: "分享链接已生成" },
  ];
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-xl rounded-t-3xl border border-[#dfcfb2] bg-[#fffaf2] p-5 shadow-[0_30px_80px_-36px_rgba(0,0,0,0.45)] sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white/70 text-[var(--ink-soft)]"
        >
          <X size={16} strokeWidth={1.8} />
        </button>
        <div className="cn-serif text-[12px] text-[#8f5f68]">复用路线</div>
        <h3 className="mt-1 pr-10 cn-serif text-[19px] leading-snug text-[var(--ink)]">{title}</h3>
        <p className="mt-1 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
          选择这条路线下一次要怎么用。
        </p>
        <div className="mt-4 grid gap-2">
          {actions.map((action, index) => (
            <button
              key={action.label}
              onClick={() => {
                onNotify(action.feedback);
                onClose();
                if (action.go) onGo();
              }}
              className={`min-h-11 rounded-2xl px-3 cn-serif text-[13px] ${
                index === 0
                  ? "bg-[#6f5850] text-white"
                  : "border border-[#ead8d0] bg-white/60 text-[var(--ink)]"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExportSizeDialog({
  exporting,
  onClose,
  onPick,
}: {
  exporting: boolean;
  onClose: () => void;
  onPick: (type: "image/png" | "image/jpeg") => void;
}) {
  const options = [
    { label: "朋友圈长图", desc: "PNG，适合直接分享", type: "image/png" as const },
    { label: "小红书封面", desc: "JPG，文件更轻", type: "image/jpeg" as const },
    { label: "原图尺寸", desc: "PNG，保留当前预览比例", type: "image/png" as const },
  ];
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-xl rounded-t-3xl border border-[#dfcfb2] bg-[#fffaf2] p-5 shadow-[0_30px_80px_-36px_rgba(0,0,0,0.45)] sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white/70 text-[var(--ink-soft)]"
        >
          <X size={16} strokeWidth={1.8} />
        </button>
        <div className="cn-serif text-[12px] text-[#8f5f68]">导出图片</div>
        <h3 className="mt-1 cn-serif text-[19px] text-[var(--ink)]">选择导出尺寸</h3>
        <div className="mt-4 grid gap-2">
          {options.map((option, index) => (
            <button
              key={`${option.label}-${index}`}
              disabled={exporting}
              onClick={() => onPick(option.type)}
              className="min-h-14 rounded-2xl border border-[#ead8d0] bg-white/60 px-3 text-left disabled:opacity-50"
            >
              <div className="cn-serif text-[13px] text-[var(--ink)]">{option.label}</div>
              <div className="cn-serif text-[11px] text-[var(--ink-soft)]">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArchiveSwitchboard({
  assetMode,
  activeTab,
  visibleTabs,
  rangeKey,
  rangeLabel,
  onModeChange,
  onTabChange,
  onRangeChange,
}: {
  assetMode: AssetMode;
  activeTab: Tab;
  visibleTabs: Array<[Tab, string]>;
  rangeKey: RangeKey;
  rangeLabel: string;
  onModeChange: (mode: AssetMode) => void;
  onTabChange: (tab: Tab) => void;
  onRangeChange: (range: RangeKey) => void;
}) {
  return (
    <section className="max-w-xl mx-auto px-5 mt-3">
      <div className="rounded-[24px] border border-[var(--border)] bg-[#fffaf2]/88 p-2 shadow-[0_14px_42px_-38px_rgba(61,53,48,0.5)]">
        <div className="grid grid-cols-2 gap-1 cn-serif text-[12px]">
          {(
            [
              ["single", "单次路线资产"],
              ["longterm", "长期路线资产"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              className={`min-h-11 rounded-[18px] transition ${
                assetMode === mode
                  ? "bg-[#9a8367] text-[#ffffff] shadow-[0_12px_26px_-20px_rgba(123,104,86,0.55)]"
                  : "text-[var(--ink-soft)] hover:bg-[var(--muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1 cn-serif text-[12px]">
          {visibleTabs.map(([key, label]) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className={`min-h-10 rounded-[16px] border transition ${
                  active
                    ? "border-[#d0b370] bg-[#f6e7bd] text-[var(--ink)]"
                    : "border-transparent text-[var(--ink-soft)] hover:bg-[var(--muted)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 px-2">
          <div className="cn-serif text-[10px] text-[var(--ink-soft)]">当前范围：{rangeLabel}</div>
          {assetMode === "longterm" && (
            <div className="flex shrink-0 gap-1">
              {(
                [
                  ["30d", "30天"],
                  ["90d", "90天"],
                  ["year", "1年"],
                  ["all", "全部"],
                ] as const
              ).map(([range, label]) => (
                <button
                  key={range}
                  onClick={() => onRangeChange(range)}
                  className={`min-h-8 rounded-full px-2.5 cn-serif text-[10px] transition ${
                    rangeKey === range
                      ? "bg-[#9a8367] text-[#ffffff]"
                      : "bg-[var(--muted)] text-[var(--ink-soft)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AssetOverviewCard({
  assetMode,
  rangeLabel,
  stats,
  library,
  cloudStatus,
  onAction,
}: {
  assetMode: AssetMode;
  rangeLabel: string;
  stats: { chapters: number; scenes: number; enhanced: number; cities: number; rarities: number };
  library: ReturnType<typeof buildLibrary>;
  cloudStatus: "idle" | "syncing" | "synced" | "local";
  onAction: () => void;
}) {
  const syncText =
    cloudStatus === "syncing" ? "同步中" : cloudStatus === "synced" ? "已同步" : "本地保存";
  const items =
    assetMode === "single"
      ? [
          ["路线记录", stats.chapters],
          ["已完成地点", stats.scenes],
          ["补充记录", stats.enhanced > 0 ? stats.enhanced : "待完善"],
        ]
      : [
          ["路线", stats.chapters],
          ["地点", library.places.length],
          ["活动", library.activities.length],
        ];
  const actionText = assetMode === "single" ? "继续完善本次资产" : "查看未完善资产";
  return (
    <section className="max-w-xl mx-auto px-5 mt-3">
      <div className="rounded-[22px] border border-[#e2d5bd] bg-[linear-gradient(135deg,#fffaf2_0%,#f7ecd4_100%)] px-3.5 py-2.5 shadow-[0_14px_40px_-36px_rgba(61,53,48,0.48)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="display text-[9px] tracking-[0.32em] text-[#a7833f]">
              ASSET OVERVIEW
            </div>
            <div className="cn-serif text-[14px] leading-snug text-[var(--ink)] mt-1">
              {assetMode === "single" ? "最近一次路线资产" : "长期路线资产概览"}
            </div>
            <div className="cn-serif text-[10.5px] text-[var(--ink-soft)] mt-0.5">
              {rangeLabel} · {syncText}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 shrink-0">
            {items.map(([label, value]) => (
              <div
                key={label}
                className="min-w-[52px] rounded-2xl border border-[#e3d3b7] bg-white/58 px-2 py-1.5 text-center"
              >
                <div className="display text-[16px] leading-none text-[#8f5f68]">{value}</div>
                <div className="cn-serif text-[9.5px] text-[var(--ink-soft)] mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={onAction}
          className="mt-2 min-h-8 rounded-full border border-[#ead8d0] bg-white/48 px-3 cn-serif text-[11px] text-[var(--ink)]"
        >
          {actionText}
        </button>
      </div>
    </section>
  );
}

function FilterBar({
  filters,
  onChange,
  mode,
}: {
  filters: MeFilters;
  onChange: (f: MeFilters) => void;
  mode: AssetMode;
}) {
  const f = filters;
  const set = (patch: Partial<MeFilters>) => onChange({ ...f, ...patch });
  const sorts: { k: SortKey; l: string }[] =
    mode === "single"
      ? [
          { k: "recent", l: "地点排序：最近访问" },
          { k: "enhanced", l: "访问次数" },
          { k: "order", l: "最近完善" },
        ]
      : [
          { k: "recent", l: "资产排序：最近完成" },
          { k: "enhanced", l: "可复用度" },
          { k: "order", l: "路线数量" },
        ];
  const Chip = ({
    on,
    onClick,
    icon,
    children,
  }: {
    on: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-1.5 px-3 py-1 rounded-full cn-serif text-[11px] border transition ${
        on
          ? "bg-[#6f5850] text-[#ffffff] border-[#6f5850]"
          : "bg-[var(--card)] text-[var(--ink-soft)] border-[var(--border)] hover:text-[var(--ink)]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/80 backdrop-blur px-3 py-3 space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mr-1">
          <SlidersHorizontal size={13} strokeWidth={1.8} />
          {mode === "single" ? "本次收藏排序" : "资产库排序"}
        </span>
        {sorts.map((s) => (
          <Chip key={s.k} on={f.sort === s.k} onClick={() => set({ sort: s.k })}>
            {s.l}
          </Chip>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mr-1">
          {mode === "single" ? "地点/活动筛选" : "资产筛选"}
        </span>
        <Chip
          on={f.onlyPhoto}
          onClick={() => set({ onlyPhoto: !f.onlyPhoto })}
          icon={<Camera size={13} strokeWidth={1.8} />}
        >
          仅有照片
        </Chip>
        <Chip
          on={f.onlyNote}
          onClick={() => set({ onlyNote: !f.onlyNote })}
          icon={<PenLine size={13} strokeWidth={1.8} />}
        >
          仅有随笔
        </Chip>
        <span className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] ml-2 mr-1">
          完善度 ≥
        </span>
        {[0, 1, 2, 3].map((n) => (
          <Chip key={n} on={f.minLevel === n} onClick={() => set({ minLevel: n })}>
            {n}
          </Chip>
        ))}
        {(f.onlyPhoto || f.onlyNote || f.minLevel > 0 || f.sort !== "recent") && (
          <button
            onClick={() =>
              onChange({ sort: "recent", onlyPhoto: false, onlyNote: false, minLevel: 0 })
            }
            className="ml-auto cn-serif text-[11px] text-[var(--ink-soft)] underline underline-offset-2"
          >
            重置
          </button>
        )}
      </div>
    </div>
  );
}

function StatChip({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] py-2.5">
      <div className="display text-[20px] text-[var(--ink)] leading-none">{n}</div>
      <div className="cn-serif text-[10px] text-[var(--ink-soft)] mt-1 tracking-widest">
        {label}
      </div>
    </div>
  );
}

function EmptyState({ onGo }: { onGo: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 p-8 text-center mt-6">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--accent)] shadow-[0_14px_34px_-26px_rgba(61,53,48,0.5)]">
        <BookOpen size={28} strokeWidth={1.6} />
      </div>
      <div className="cn-serif text-[15px] text-[var(--ink)]">连载还没有第一章</div>
      <div className="cn-serif text-[12px] text-[var(--ink-soft)] mt-1">
        抽一张人设卡，走完今天的故事
      </div>
      <button onClick={onGo} className="btn-soft mt-5">
        去抽卡 →
      </button>
    </div>
  );
}

function PostchainCommandCenter({
  activeTab,
  assetMode,
  sagas,
  library,
  cloudStatus,
}: {
  activeTab: Tab;
  assetMode: AssetMode;
  sagas: ArchivedChapter[];
  library: ReturnType<typeof buildLibrary>;
  cloudStatus?: "idle" | "syncing" | "synced" | "local";
}) {
  const completedNodes = sagas.reduce(
    (sum, chapter) => sum + chapter.completedSceneOrders.length,
    0,
  );
  const latestChapter = sagas[0];
  const viewLabel =
    activeTab === "poster"
      ? "复盘海报"
      : activeTab === "profile"
        ? "长期报告"
        : activeTab === "library"
          ? "路线收藏"
          : "连载故事";
  const collectedClues = library.places.length + library.activities.length;
  const moodTags = Array.from(
    new Set(
      sagas.flatMap((chapter) =>
        chapter.journey.scenes
          .filter((scene) => chapter.completedSceneOrders.includes(scene.order))
          .flatMap((scene) => scene.emotion_tags),
      ),
    ),
  ).slice(0, 4);
  const heroTitle =
    assetMode === "single" ? "这次周末，已经被好好收进册页" : "这些周末，正在长成你的城市偏好";
  const heroCopy =
    assetMode === "single"
      ? "把走过的地方、亮起的心情和那张人设卡放在一起，像翻开一页刚晒干的手帐。"
      : "每一次出门都会留下纹理：常去的地点、反复出现的心情，以及下一次想继续靠近的城市角落。";
  const syncLabel =
    cloudStatus === "syncing"
      ? "云端同步中"
      : cloudStatus === "synced"
        ? "已同步"
        : cloudStatus === "local"
          ? "本地保存"
          : "已保存";

  return (
    <section className="relative min-h-[254px] overflow-hidden rounded-[30px] border border-[#e0d4bd] bg-[#6f5850] text-[#ffffff] shadow-[0_26px_78px_-48px_rgba(61,53,48,0.88)]">
      {imageForChapter(latestChapter) ? (
        <img
          src={imageForChapter(latestChapter)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-34"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${latestChapter?.card.colors[0] ?? "#f5b8c4"}, ${latestChapter?.card.colors[1] ?? "#e8c97a"})`,
          }}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(61,53,48,0.94)_0%,rgba(61,53,48,0.78)_54%,rgba(61,53,48,0.48)_100%)]" />
      <div className="absolute inset-x-5 top-4 h-px bg-white/24" />
      <div className="relative flex min-h-[254px] flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-[#f2d992] backdrop-blur">
              <Sparkles size={21} strokeWidth={1.7} />
            </div>
            <div className="min-w-0">
              <div className="display text-[9px] tracking-[0.32em] text-[#f2d992]">
                WEEKEND ECHO
              </div>
              <div className="cn-serif text-[11px] text-white/58">周末回声册 · {syncLabel}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="rounded-full border border-white/22 bg-white/14 px-3 py-1.5 cn-serif text-[11px] text-white/82 backdrop-blur">
              正在翻看 · {viewLabel}
            </div>
          </div>
        </div>

        <div className="mt-7">
          <h2 className="cn-serif text-[25px] leading-tight">{heroTitle}</h2>
          <p className="cn-serif text-[12px] leading-relaxed text-white/72 mt-2 max-w-[31em]">
            {heroCopy}
          </p>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
          <PostchainHubMetric value={sagas.length} label="周末" detail="已收藏" />
          <PostchainHubMetric value={completedNodes} label="片段" detail="被点亮" />
          <PostchainHubMetric value={collectedClues} label="线索" detail="可再翻起" />
        </div>

        <div className="mt-3 flex flex-nowrap gap-1.5 overflow-hidden">
          {[latestChapter?.city, latestChapter?.card.identity, ...moodTags]
            .filter(Boolean)
            .slice(0, 5)
            .map((tag) => (
              <span
                key={tag}
                className="shrink-0 rounded-full border border-white/18 bg-white/12 px-2.5 py-1 cn-serif text-[10px] text-white/74 backdrop-blur"
              >
                {tag}
              </span>
            ))}
        </div>
      </div>
    </section>
  );
}

function PostchainHubMetric({
  value,
  label,
  detail,
}: {
  value: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/14 bg-white/[0.08] px-3 py-2.5 backdrop-blur">
      <div className="display text-[22px] leading-none text-[#f2d992]">{value}</div>
      <div className="cn-serif text-[11px] mt-0.5">{label}</div>
      <div className="cn-serif text-[9px] text-white/50 mt-0.5">{detail}</div>
    </div>
  );
}

/* ============ 连载小说 ============ */
type ExportJob =
  | { kind: "chapter"; ch: ArchivedChapter; chapterNo: number; mode: "download" | "share" }
  | { kind: "series"; chapters: ArchivedChapter[]; mode: "download" | "share" };

function chapterMeta(ch: ArchivedChapter) {
  const recs = Object.values(ch.sceneRecords ?? {});
  const enhanced = recs.filter((r) => r.note || r.photo).length;
  const hasPhoto = recs.some((r) => !!r.photo);
  const hasNote = recs.some((r) => !!r.note);
  const lastAt = recs.reduce(
    (m, r) => Math.max(m, r.completedAt ?? 0),
    ch.archivedAt ?? ch.createdAt,
  );
  return { enhanced, hasPhoto, hasNote, lastAt };
}

function NovelView({
  sagas,
  filters,
  mode,
  onGo,
  onNotify,
  onDelete,
}: {
  sagas: ArchivedChapter[];
  filters: MeFilters;
  mode: AssetMode;
  onGo: () => void;
  onNotify: (message: string) => void;
  onDelete: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showAllChapters, setShowAllChapters] = useState(false);
  const [chapterViewMode, setChapterViewMode] = useState<"card" | "list">("card");
  const insights = useMemo(() => buildSerialInsights(sagas), [sagas]);

  // Original chapter numbers come from original order (newest first)
  const indexed = useMemo(
    () => sagas.map((ch, idx) => ({ ch, chapterNo: sagas.length - idx, meta: chapterMeta(ch) })),
    [sagas],
  );
  const visible = useMemo(() => {
    let list = indexed.filter(({ meta }) => {
      if (filters.onlyPhoto && !meta.hasPhoto) return false;
      if (filters.onlyNote && !meta.hasNote) return false;
      if (filters.minLevel > 0 && meta.enhanced < filters.minLevel) return false;
      return true;
    });
    if (filters.sort === "enhanced")
      list = [...list].sort(
        (a, b) => b.meta.enhanced - a.meta.enhanced || b.meta.lastAt - a.meta.lastAt,
      );
    else if (filters.sort === "recent")
      list = [...list].sort((a, b) => b.meta.lastAt - a.meta.lastAt);
    // "order" keeps original (newest chapter first)
    return list;
  }, [indexed, filters]);

  const openEntry =
    visible.find((v) => v.ch.chapterId === openId) ??
    indexed.find((v) => v.ch.chapterId === openId) ??
    null;
  const visibleChapters = showAllChapters ? visible : visible.slice(0, 3);

  function runChapterExport(ch: ArchivedChapter, mode: "download" | "share") {
    const entry = indexed.find((v) => v.ch.chapterId === ch.chapterId);
    setExportJob({ kind: "chapter", ch, chapterNo: entry?.chapterNo ?? 1, mode });
    setExporting(true);
  }
  function runSeriesExport(mode: "download" | "share") {
    setExportJob({ kind: "series", chapters: sagas, mode });
    setExporting(true);
  }

  if (mode === "single") {
    const entry = indexed[0];
    if (!entry) return null;
    return (
      <SingleChapterNovel
        ch={entry.ch}
        chapterNo={entry.chapterNo}
        onGo={onGo}
        onNotify={onNotify}
        onDelete={() => onDelete(entry.ch.chapterId)}
        onExport={(exportMode) => runChapterExport(entry.ch, exportMode)}
        exporting={
          exporting &&
          exportJob?.kind === "chapter" &&
          exportJob.ch.chapterId === entry.ch.chapterId
        }
        exportRunner={
          exportJob ? (
            <ExportRunner
              job={exportJob}
              onDone={() => {
                setExporting(false);
                setExportJob(null);
                onNotify("PDF 已生成");
              }}
            />
          ) : null
        }
      />
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-[30px] border border-[#d8c4a3] bg-[#fffaf2] mb-5 shadow-[0_22px_64px_-54px_rgba(61,53,48,0.72)]">
        <div className="bg-[linear-gradient(135deg,#fff6df_0%,#efe0c4_100%)] px-4 py-4 text-[var(--ink)]">
          <div className="display text-[10px] tracking-[0.35em] text-[#8f5f68]">CITY THREAD</div>
          <h2 className="cn-serif text-[21px] leading-snug mt-2">{insights.autoTitle}</h2>
          <p className="cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)] mt-2">
            长期画像会从多次路线中提取连续出现的主题线索，形成一条可以持续阅读和复用的城市支线。
          </p>
          <p className="cn-serif text-[12px] leading-relaxed text-[var(--ink)] mt-2">
            {insights.mainlineSummary}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-[#dfcfb2] bg-white/48 px-3 py-2">
              <div className="display text-[21px] text-[#8f5f68] leading-none">{sagas.length}</div>
              <div className="cn-serif text-[10px] text-[var(--ink-soft)] mt-1">路线记录</div>
            </div>
            <div className="rounded-2xl border border-[#dfcfb2] bg-white/48 px-3 py-2">
              <div className="display text-[21px] text-[#8f5f68] leading-none">
                {sagas.reduce((sum, chapter) => sum + chapter.completedSceneOrders.length, 0)}
              </div>
              <div className="cn-serif text-[10px] text-[var(--ink-soft)] mt-1">地点</div>
            </div>
            <div className="rounded-2xl border border-[#dfcfb2] bg-white/48 px-3 py-2">
              <div className="display text-[21px] text-[#8f5f68] leading-none">
                {insights.timelineTags.length}
              </div>
              <div className="cn-serif text-[10px] text-[var(--ink-soft)] mt-1">线索</div>
            </div>
          </div>
        </div>
        <div className="grid gap-2 p-4">
          {[insights.personaShift, insights.cityProgress, insights.monthlyRecap].map(
            (item, index) => (
              <div
                key={item}
                className={`rounded-2xl border px-3 py-2 cn-serif text-[12px] leading-relaxed ${
                  index === 0
                    ? "border-[#d0b370] bg-[#f8edcc] text-[var(--ink)]"
                    : "border-[var(--border)] bg-white/62 text-[var(--ink-soft)]"
                }`}
              >
                {item}
              </div>
            ),
          )}
        </div>
        <div className="px-4 pb-4 flex flex-wrap gap-1.5">
          {insights.timelineTags.map((tag) => (
            <span
              key={tag}
              className="cn-serif text-[10px] px-2 py-1 rounded-full bg-white/72 border border-[var(--border)] text-[var(--ink-soft)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between mb-3">
        <div className="cn-serif text-[11px] text-[var(--ink-soft)]">
          显示 {visibleChapters.length}/{visible.length} 条 · 点击查看详情
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setChapterViewMode((mode) => (mode === "card" ? "list" : "card"))}
            className="cn-serif text-[11px] px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)]"
          >
            {chapterViewMode === "card" ? "列表模式" : "卡片模式"}
          </button>
          <button
            onClick={() => runSeriesExport("download")}
            disabled={exporting}
            className="cn-serif text-[11px] px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] disabled:opacity-50"
          >
            {exporting && exportJob?.kind === "series" ? "导出中…" : "更多操作"}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 p-6 text-center cn-serif text-[12px] text-[var(--ink-soft)]">
          没有符合筛选条件的路线记录
        </div>
      ) : (
        <div className="space-y-4">
          {visibleChapters.map(({ ch, chapterNo, meta }) => {
            const date = new Date(ch.createdAt);
            const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
            const total = ch.journey.scenes.length;
            const done = ch.completedSceneOrders.length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const cover = imageForChapter(ch);
            if (chapterViewMode === "list") {
              return (
                <button
                  key={ch.chapterId}
                  onClick={() => setOpenId(ch.chapterId)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="cn-serif text-[14px] text-[var(--ink)] truncate">
                        {insights.chapterTitles[ch.chapterId] ?? ch.card.identity}
                      </div>
                      <div className="mt-1 cn-serif text-[11px] text-[var(--ink-soft)]">
                        CH.{String(chapterNo).padStart(2, "0")} · {dateStr} · {done}/{total} 地点
                      </div>
                    </div>
                    <span className="rounded-full border border-[var(--border)] px-2 py-1 cn-serif text-[10px] text-[var(--ink-soft)]">
                      查看
                    </span>
                  </div>
                </button>
              );
            }
            return (
              <button
                key={ch.chapterId}
                onClick={() => setOpenId(ch.chapterId)}
                className="persona-card w-full text-left overflow-hidden block transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgba(0,0,0,0.35)]"
                data-rarity={ch.card.rarity}
              >
                <div
                  className="relative h-36 overflow-hidden"
                  style={
                    cover
                      ? undefined
                      : {
                          background: `linear-gradient(135deg, ${ch.card.colors[0]}, ${ch.card.colors[1]})`,
                        }
                  }
                >
                  {cover && (
                    <img
                      src={cover}
                      alt={ch.card.identity}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                    <div className="rarity-chip" data-rarity={ch.card.rarity}>
                      ✦ {ch.card.rarity}
                    </div>
                    <div className="rounded-full bg-white/82 px-2.5 py-1 cn-serif text-[10px] text-[var(--ink)]">
                      {cover ? "人设封面" : "默认封面"}
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <div className="display italic text-[11px] opacity-80">
                      {dateStr} {ch.city && `· ${ch.city}`}
                    </div>
                    <div className="cn-serif text-[17px] leading-snug mt-0.5 line-clamp-1">
                      「{insights.chapterTitles[ch.chapterId] ?? ch.card.identity}」
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between text-[11px] cn-serif text-[var(--ink-soft)]">
                    <span className="flex items-center gap-1.5">
                      {done}/{total} 已完成 · 补充记录 {meta.enhanced}
                      {meta.hasPhoto && <Camera size={13} strokeWidth={1.8} aria-label="有照片" />}
                      {meta.hasNote && <PenLine size={13} strokeWidth={1.8} aria-label="有随笔" />}
                    </span>
                    <span className="display tracking-[0.2em]">查看 →</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
          {visible.length > 3 && (
            <button
              onClick={() => setShowAllChapters((value) => !value)}
              className="btn-ghost w-full justify-center text-[12px]"
            >
              {showAllChapters ? "收起路线记录" : `查看全部 ${visible.length} 条路线记录`}
            </button>
          )}
        </div>
      )}

      {openEntry && (
        <ChapterDetail
          ch={openEntry.ch}
          chapterNo={openEntry.chapterNo}
          onClose={() => setOpenId(null)}
          onExport={(mode) => runChapterExport(openEntry.ch, mode)}
          exporting={
            exporting &&
            exportJob?.kind === "chapter" &&
            exportJob.ch.chapterId === openEntry.ch.chapterId
          }
          onDelete={() => {
            if (confirm("从连载中移除这一章？")) {
              setOpenId(null);
              onDelete(openEntry.ch.chapterId);
            }
          }}
        />
      )}

      {exportJob && (
        <ExportRunner
          job={exportJob}
          onDone={() => {
            setExporting(false);
            setExportJob(null);
            onNotify("PDF 已生成");
          }}
        />
      )}
      {exporting && (
        <div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] px-6 py-4 cn-serif text-[13px] text-[var(--ink)] shadow-lg">
            正在生成 PDF…
          </div>
        </div>
      )}
    </>
  );
}

function buildNextRouteIdea(ch: ArchivedChapter) {
  const completed = ch.journey.scenes.filter((scene) =>
    ch.completedSceneOrders.includes(scene.order),
  );
  const categories = Array.from(new Set(completed.map((scene) => scene.location_type))).slice(0, 3);
  const emotions = Array.from(new Set(completed.flatMap((scene) => scene.emotion_tags))).slice(
    0,
    3,
  );
  const city = ch.city || "当前城市";
  const base = categories[0] || "城市漫游";
  return {
    title: `${city} · ${base}延展路线`,
    body: `下一次可以沿着这次的${categories.join("、") || "路线气质"}继续走，但换一个商圈或加入一个更明确的收尾地点。`,
    proof: [
      completed.length ? `本次已完成 ${completed.length}/${ch.journey.scenes.length} 个地点` : "",
      categories.length ? `可延展品类：${categories.join("、")}` : "",
      emotions.length ? `延续情绪：${emotions.join("、")}` : "",
    ].filter(Boolean),
  };
}

function SingleChapterNovel({
  ch,
  chapterNo,
  onGo,
  onNotify,
  onDelete,
  onExport,
  exporting,
  exportRunner,
}: {
  ch: ArchivedChapter;
  chapterNo: number;
  onGo: () => void;
  onNotify: (message: string) => void;
  onDelete: () => void;
  onExport: (mode: "download" | "share") => void;
  exporting: boolean;
  exportRunner: React.ReactNode;
}) {
  const [reuseOpen, setReuseOpen] = useState(false);
  const date = new Date(ch.createdAt);
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  const nextIdea = buildNextRouteIdea(ch);
  const total = ch.journey.scenes.length;
  const done = ch.completedSceneOrders.length;
  const completion = total ? Math.round((done / total) * 100) : 0;
  const completed = ch.journey.scenes.filter((scene) =>
    ch.completedSceneOrders.includes(scene.order),
  );
  const categories = Array.from(new Set(completed.map((scene) => scene.location_type))).slice(0, 3);
  const keywords = Array.from(new Set(completed.flatMap((scene) => scene.emotion_tags))).slice(
    0,
    4,
  );
  const completedRecords = Object.values(ch.sceneRecords ?? {}).filter((r) => r.note || r.photo);

  return (
    <div className="space-y-5">
      {reuseOpen && (
        <ReuseRouteDialog
          title={ch.card.identity}
          onClose={() => setReuseOpen(false)}
          onGo={onGo}
          onNotify={onNotify}
        />
      )}
      <section className="persona-card overflow-hidden" data-rarity={ch.card.rarity}>
        <div
          className="relative h-36 overflow-hidden"
          style={
            imageForChapter(ch)
              ? undefined
              : {
                  background: `linear-gradient(135deg, ${ch.card.colors[0]}, ${ch.card.colors[1]})`,
                }
          }
        >
          {imageForChapter(ch) && (
            <img
              src={imageForChapter(ch)}
              alt={ch.card.identity}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <div className="rarity-chip" data-rarity={ch.card.rarity}>
              ✦ {ch.card.rarity}
            </div>
            <div className="rounded-full bg-white/85 px-2.5 py-1 cn-serif text-[10px] text-[var(--ink)]">
              {completion}% 已完成
            </div>
          </div>
          <div className="absolute right-3 top-12 rounded-full bg-white/78 px-2.5 py-1 cn-serif text-[10px] text-[var(--ink-soft)]">
            {imageForChapter(ch) ? "人设封面" : "默认封面"}
          </div>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="display italic text-[11px] opacity-80">
              CH.{String(chapterNo).padStart(2, "0")} · {dateStr} {ch.city && `· ${ch.city}`}
            </div>
            <h2 className="cn-serif text-[22px] leading-snug mt-1">「{ch.card.identity}」</h2>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/38 p-3">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat n={`${done}/${total}`} label="完成地点" />
              <MiniStat
                n={completedRecords.length > 0 ? completedRecords.length : "待补充"}
                label="补充随笔"
              />
            </div>
            <div className="cn-serif text-[12px] leading-relaxed text-[var(--ink)]">
              路线类型：{categories.join(" / ") || "城市漫游"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[ch.city, ch.card.rarity, ...keywords].filter(Boolean).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--border)] bg-white/70 px-2.5 py-1 cn-serif text-[10.5px] text-[var(--ink-soft)]"
                >
                  {tag}
                </span>
              ))}
            </div>
            {completedRecords.length === 0 && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[#ead8d0] bg-white/56 px-3 py-2">
                <div className="cn-serif text-[12px] text-[var(--ink)]">还没有补充随笔</div>
                <button
                  onClick={() => onNotify("已打开本次资产补充入口")}
                  className="rounded-full border border-[#ead8d0] px-3 py-1 cn-serif text-[11px] text-[var(--ink)]"
                >
                  补充一条记录
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNotify("已定位到复盘内容")}
                className="min-h-10 rounded-2xl border border-[#ead8d0] bg-white/55 cn-serif text-[12px] text-[var(--ink)]"
              >
                查看复盘
              </button>
              <button
                onClick={() => setReuseOpen(true)}
                className="min-h-10 rounded-2xl bg-[#6f5850] cn-serif text-[12px] text-[#ffffff]"
              >
                再走一次
              </button>
            </div>
          </div>
          <p className="cn-serif text-[14px] leading-relaxed text-[var(--ink)]">
            {ch.journey.story_opening}
          </p>
          <div className="grid gap-3">
            {ch.journey.scenes.map((scene) => {
              const done = ch.completedSceneOrders.includes(scene.order);
              const rec = ch.sceneRecords?.[scene.order];
              return (
                <div
                  key={scene.order}
                  className={`rounded-2xl border px-3 py-3 ${
                    done
                      ? "bg-[var(--card)] border-[var(--border)]"
                      : "bg-[var(--muted)]/45 border-dashed border-[var(--border)] opacity-70"
                  }`}
                >
                  <div className="display text-[9px] tracking-[0.28em] text-[var(--ink-soft)]">
                    STEP {scene.order} · {done ? "已完成" : "未完成"}
                  </div>
                  <div className="cn-serif text-[15px] text-[var(--ink)] mt-1">
                    {scene.scene_name}
                  </div>
                  <p className="cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)] mt-1">
                    {rec?.note || scene.persona_narrative}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="cn-serif text-[14px] leading-relaxed text-[var(--ink)]">
            {ch.journey.closing}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onExport("download")}
              disabled={exporting}
              className="btn-soft text-[12px] flex-1 justify-center"
            >
              {exporting ? "导出中…" : "导出本章 PDF"}
            </button>
            <button
              onClick={() => {
                if (window.confirm("删除后不可恢复，确认删除这条路线记录？")) onDelete();
              }}
              className="rounded-full border border-[#e7c7c2] bg-[#fff5f3] px-3 cn-serif text-[12px] text-[#9f544c]"
            >
              删除
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
          NEXT ROUTE · 下一次可以走什么
        </div>
        <h3 className="cn-serif text-[18px] text-[var(--ink)] mt-2">{nextIdea.title}</h3>
        <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink)] mt-2">
          {nextIdea.body}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {nextIdea.proof.map((item) => (
            <span
              key={item}
              className="cn-serif text-[11px] px-2.5 py-1 rounded-full bg-[var(--muted)] text-[var(--ink-soft)] border border-[var(--border)]"
            >
              {item}
            </span>
          ))}
        </div>
      </section>
      {exportRunner}
    </div>
  );
}

function ChapterDetail({
  ch,
  chapterNo,
  onClose,
  onDelete,
  onExport,
  exporting,
}: {
  ch: ArchivedChapter;
  chapterNo: number;
  onClose: () => void;
  onDelete: () => void;
  onExport: (mode: "download" | "share") => void;
  exporting: boolean;
}) {
  const date = new Date(ch.createdAt);
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  const total = ch.journey.scenes.length;
  const done = ch.completedSceneOrders.length;
  const enhanced = Object.values(ch.sceneRecords ?? {}).filter((r) => r.note || r.photo).length;

  // 奖励：本章点亮的地点 + 活动
  const rewards = ch.journey.scenes
    .filter((s) => ch.completedSceneOrders.includes(s.order))
    .map((s) => ({
      order: s.order,
      place: s.location_name,
      type: s.location_type,
      action: s.action_task,
    }));

  // 关闭：ESC + 锁滚动
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-[fade-up_0.2s_ease-out]"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] fade-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Cover */}
        <div
          className="relative h-44 overflow-hidden rounded-t-3xl"
          style={
            imageForChapter(ch)
              ? undefined
              : {
                  background: `linear-gradient(135deg, ${ch.card.colors[0]}, ${ch.card.colors[1]})`,
                }
          }
        >
          {imageForChapter(ch) && (
            <img
              src={imageForChapter(ch)}
              alt={ch.card.identity}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 text-[var(--ink)] flex items-center justify-center text-[14px]"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
          <div className="absolute top-3 left-3 rarity-chip" data-rarity={ch.card.rarity}>
            ✦ {ch.card.rarity} · CH.{String(chapterNo).padStart(2, "0")}
          </div>
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="display italic text-[11px] opacity-85">
              {dateStr} {ch.city && `· ${ch.city}`}
            </div>
            <div className="cn-serif text-[19px] leading-snug mt-0.5">「{ch.card.identity}」</div>
            <div className="cn-serif text-[12px] opacity-85 mt-0.5 italic">{ch.card.mood}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 pt-4 grid grid-cols-3 gap-2">
          <MiniStat n={`${done}/${total}`} label="点亮场景" />
          <MiniStat n={enhanced} label="笔记/照片" />
          <MiniStat
            n={`${ch.journey.emotion_arc.start} → ${ch.journey.emotion_arc.end}`}
            label="情绪弧"
            small
          />
        </div>

        {/* Rewards */}
        {rewards.length > 0 && (
          <div className="px-5 mt-5">
            <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
              REWARDS · 本章解锁
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rewards.map((r) => (
                <span
                  key={r.order}
                  className="inline-flex items-center gap-1 text-[11px] cn-serif px-2 py-1 rounded-full bg-[var(--muted)] border border-[var(--border)] text-[var(--ink)]"
                  title={r.action}
                >
                  <VenueIcon kind={detectVenue(r.type, r.place)} size={14} />
                  {r.place} <span className="text-[var(--accent)]">+1</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Opening */}
        <div className="px-5 mt-6">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
            序章 · OPENING
          </div>
          <p className="cn-serif text-[14px] leading-[1.95] text-[var(--ink)] mt-1.5">
            {ch.journey.story_opening}
          </p>
        </div>

        {/* Timeline */}
        <div className="px-5 mt-5">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-3">
            TIMELINE · 逐场景
          </div>
          <ol className="space-y-5">
            {ch.journey.scenes.map((s) => {
              const rec = ch.sceneRecords?.[s.order];
              const isDone = ch.completedSceneOrders.includes(s.order);
              const time = rec?.completedAt ? new Date(rec.completedAt) : null;
              const timeStr = time
                ? `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`
                : null;
              return (
                <li
                  key={s.order}
                  className={`relative pl-7 border-l-2 ${isDone ? "border-[var(--accent)]" : "border-[var(--border)]"}`}
                >
                  <span
                    className="absolute -left-[10px] top-0.5 w-[18px] h-[18px] rounded-full bg-[var(--card)] border-2 border-[var(--accent)] flex items-center justify-center text-[10px] text-[var(--accent)]"
                    style={{ opacity: isDone ? 1 : 0.35 }}
                  >
                    {isDone ? "✓" : ""}
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="display italic text-[11px] text-[var(--ink-soft)]">
                        § {s.order}
                      </span>
                      <span className="cn-serif text-[14px] text-[var(--ink)] truncate">
                        {s.scene_name}
                      </span>
                      {rec?.mood && <span className="text-[14px]">{rec.mood}</span>}
                    </div>
                    {timeStr ? (
                      <span className="display text-[10px] tracking-widest text-[var(--ink-soft)] shrink-0">
                        {timeStr}
                      </span>
                    ) : (
                      <span className="display text-[10px] tracking-widest text-[var(--ink-soft)] shrink-0 opacity-60">
                        未点亮
                      </span>
                    )}
                  </div>
                  <p className="cn-serif text-[13px] leading-[1.9] text-[var(--ink)] mt-1">
                    {s.persona_narrative}
                  </p>
                  <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-1 flex items-center gap-1.5">
                    <VenueIcon kind={detectVenue(s.location_type, s.scene_name)} size={12} />
                    {s.location_name} · {s.action_task}
                  </div>
                  {rec?.photo && (
                    <img
                      src={rec.photo}
                      alt=""
                      className="mt-2 rounded-xl border border-[var(--border)] max-h-56 object-cover"
                    />
                  )}
                  {rec?.note && (
                    <blockquote className="mt-2 cn-serif text-[13px] text-[var(--ink)] italic border-l-2 border-[var(--accent)]/50 pl-3">
                      "{rec.note}"
                    </blockquote>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Closing */}
        <div className="px-5 mt-6">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
            终章 · CLOSING
          </div>
          <p className="cn-serif text-[14px] leading-[1.95] text-[var(--ink)] mt-1.5">
            {ch.journey.closing}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] sticky bottom-0 bg-[var(--card)]/95 backdrop-blur">
          <button
            onClick={onDelete}
            className="cn-serif text-[12px] text-[var(--ink-soft)] hover:text-red-600"
          >
            删除这一章
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport("share")}
              disabled={exporting}
              className="cn-serif text-[12px] px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] disabled:opacity-50"
              title="分享 PDF（不支持时将自动下载）"
            >
              分享 ↗
            </button>
            <button
              onClick={() => onExport("download")}
              disabled={exporting}
              className="cn-serif text-[12px] px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] disabled:opacity-50"
            >
              {exporting ? "导出中…" : "导出 PDF ↓"}
            </button>
            <button onClick={onClose} className="btn-soft">
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ n, label, small }: { n: React.ReactNode; label: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 py-2 px-2 text-center">
      <div
        className={`cn-serif text-[var(--ink)] leading-tight ${small ? "text-[11px]" : "text-[14px]"}`}
      >
        {n}
      </div>
      <div className="cn-serif text-[10px] text-[var(--ink-soft)] mt-0.5 tracking-widest">
        {label}
      </div>
    </div>
  );
}

/* ============ 后链路复盘海报 ============ */
const AUTH_LABEL: Record<PostchainAuthLevel, string> = {
  basic: "基础数据权限",
  personal: "标准隐私设置",
  full: "高级隐私设置",
};

function privacyEnabledCount(privacy: PostchainPrivacySettings) {
  return Object.values(privacy).filter(Boolean).length;
}

function PostchainOverviewCard({
  chapter,
  chapterNo,
  dateStr,
  report,
  authLevel,
  privacy,
}: {
  chapter: ArchivedChapter;
  chapterNo: number;
  dateStr: string;
  report: PostchainReport;
  authLevel: PostchainAuthLevel;
  privacy: PostchainPrivacySettings;
}) {
  const enhanced = Object.values(chapter.sceneRecords ?? {}).filter(
    (item) => item.note || item.photo,
  ).length;
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[#ded2bb] bg-[#fffaf2] shadow-[0_24px_70px_-52px_rgba(61,53,48,0.68)]">
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{
          background: `linear-gradient(90deg, ${chapter.card.colors[0]}, ${chapter.card.colors[1]})`,
        }}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="display text-[10px] tracking-[0.34em] text-[var(--ink-soft)]">
              路线摘要
            </div>
            <div className="mt-1 inline-flex rounded-full border border-[#dfcfb2] bg-white/60 px-2.5 py-1 cn-serif text-[10px] text-[var(--ink-soft)]">
              CH.{String(chapterNo).padStart(2, "0")} · {AUTH_LABEL[authLevel]}
            </div>
          </div>
          <div className="rounded-full border border-[#dfcfb2] bg-[#f8edcc] px-3 py-1.5 cn-serif text-[11px] text-[var(--ink)]">
            {report.completionPercent}% 已完成
          </div>
        </div>
        <div className="min-w-0">
          <h2 className="cn-serif text-[20px] leading-snug text-[var(--ink)] mt-1">
            {report.title}
          </h2>
          <p className="cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)] mt-1">
            {dateStr}
            {privacy.showLocation && chapter.city ? ` · ${chapter.city}` : ""} ·{" "}
            {report.completionText.replace(/^已完成\s*/, "")}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-[#e2d6c0] bg-white/62 px-3 py-2">
              <div className="display text-[20px] leading-none text-[var(--accent)]">
                {enhanced > 0 ? enhanced : "待补充"}
              </div>
              <div className="cn-serif text-[11px] text-[var(--ink)] mt-0.5">补充随笔</div>
            </div>
            <div className="rounded-2xl border border-[#e2d6c0] bg-white/62 px-3 py-2">
              <div className="display text-[20px] leading-none text-[var(--accent)]">
                {report.routeKeywords.length} 个
              </div>
              <div className="cn-serif text-[11px] text-[var(--ink)] mt-0.5">关键词</div>
            </div>
          </div>

          <div className="mt-3 flex flex-nowrap gap-1.5 overflow-hidden">
            {report.routeKeywords.slice(0, 4).map((keyword) => (
              <span
                key={keyword}
                className="shrink-0 cn-serif text-[10px] px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--muted)]/60 text-[var(--ink-soft)]"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FactCheckPanel({ report }: { report: PostchainReport }) {
  const ok = report.factCheck.ok;
  return (
    <div
      className={`rounded-2xl border px-3 py-2.5 ${
        ok ? "border-[var(--border)] bg-[var(--muted)]/50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-center gap-2 cn-serif text-[12px] text-[var(--ink)]">
        {ok ? (
          <CheckCircle2 size={16} strokeWidth={1.8} className="text-[var(--accent)]" />
        ) : (
          <AlertTriangle size={16} strokeWidth={1.8} className="text-amber-700" />
        )}
        事实校验：{ok ? "通过" : "需复核"}
      </div>
      {!ok && (
        <ul className="mt-1.5 grid gap-1">
          {report.factCheck.warnings.map((warning) => (
            <li key={warning} className="cn-serif text-[11px] leading-relaxed text-amber-800">
              {warning}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PrivacySummary({
  authLevel,
  privacy,
  onOpen,
}: {
  authLevel: PostchainAuthLevel;
  privacy: PostchainPrivacySettings;
  onOpen: () => void;
}) {
  const visibleCount = privacyEnabledCount(privacy);
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)]/86 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--muted)] text-[var(--ink)]">
          <ShieldCheck size={22} strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
            DATA SETTINGS · 授权与隐私
          </div>
          <div className="cn-serif text-[14px] text-[var(--ink)] mt-1">
            {AUTH_LABEL[authLevel]} · {visibleCount}/6 项可展示
          </div>
          <p className="cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)] mt-1">
            对外报告只展示已打开字段，事实校验仍会用原始路线记录做保护。
          </p>
        </div>
        <button onClick={onOpen} className="btn-ghost min-h-10 shrink-0 text-[12px] px-3 py-1.5">
          调整
        </button>
      </div>
    </section>
  );
}

function PostchainView({
  sagas,
  empty,
  onGo,
  onNotify,
}: {
  sagas: ArchivedChapter[];
  empty: boolean;
  onGo: () => void;
  onNotify: (message: string) => void;
}) {
  const [chapterId, setChapterId] = useState(sagas[0]?.chapterId ?? "");
  const [authLevel, setAuthLevel] = useState<PostchainAuthLevel>(
    () => loadPostchainAuth() ?? "basic",
  );
  const [draftAuthLevel, setDraftAuthLevel] = useState<PostchainAuthLevel>(authLevel);
  const [authorized, setAuthorized] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [privacy, setPrivacy] = useState<PostchainPrivacySettings>(loadPostchainPrivacy);
  const [generated, setGenerated] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editableShareText, setEditableShareText] = useState("");
  const [reportEdits, setReportEdits] = useState<ReportEdits>({});
  const [shareUrl, setShareUrl] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportPickerOpen, setExportPickerOpen] = useState(false);
  const [reuseOpen, setReuseOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadPostchainConsentCloud().then((consent) => {
      if (cancelled || !consent) return;
      setAuthLevel(consent.authLevel);
      setDraftAuthLevel(consent.authLevel);
      setAuthorized(true);
      setPrivacy((current) => ({ ...current, ...consent.privacy }));
      localStorage.setItem(POSTCHAIN_AUTH_KEY, consent.authLevel);
      localStorage.setItem(
        POSTCHAIN_PRIVACY_KEY,
        JSON.stringify({ ...DEFAULT_POSTCHAIN_PRIVACY, ...consent.privacy }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!chapterId && sagas[0]) setChapterId(sagas[0].chapterId);
  }, [chapterId, sagas]);

  useEffect(() => {
    localStorage.setItem(POSTCHAIN_PRIVACY_KEY, JSON.stringify(privacy));
    if (authorized) void savePostchainConsentCloud(authLevel, privacy);
    setGenerated(true);
    setPreviewOpen(false);
  }, [authLevel, authorized, privacy]);

  if (empty) return <EmptyState onGo={onGo} />;

  const chapter = sagas.find((item) => item.chapterId === chapterId) ?? sagas[0];
  const reportStyle: PostchainReportStyle = "literary";
  const report = buildPostchainReport(chapter, { authLevel, reportStyle, privacy });
  const reportDraft = {
    ...report,
    ...reportEdits,
    storyFragments: reportEdits.storyFragments ?? report.storyFragments,
  };
  const editedReport: PostchainReport = {
    ...reportDraft,
    factCheck: validatePostchainEditedReport(chapter, privacy, reportDraft),
  };
  const chapterNo = sagas.length - sagas.findIndex((item) => item.chapterId === chapter.chapterId);
  const date = new Date(chapter.createdAt);
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  function openPreview(nextReport = report) {
    setGenerated(true);
    setPreviewOpen(true);
    setEditableShareText(nextReport.contentVariants[0]?.sections[0]?.text ?? nextReport.shareText);
    setReportEdits({});
    setShareUrl("");
  }

  async function exportPoster(type: "image/png" | "image/jpeg" = "image/png") {
    const el = posterRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const blob = await elementToImageBlob(el, type);
      const suffix = type === "image/jpeg" ? "jpg" : "png";
      await downloadBlob(
        blob,
        `今日人设_复盘海报_CH${String(chapterNo).padStart(2, "0")}.${suffix}`,
      );
      onNotify("图片已导出");
    } catch (err) {
      console.error("[poster export]", err);
      onNotify("导出失败：" + (err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function nativeSharePoster() {
    const el = posterRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const blob = await elementToImageBlob(el, "image/png");
      await shareImageOrDownload(
        blob,
        `今日人设_复盘海报_CH${String(chapterNo).padStart(2, "0")}.png`,
        editedReport.title,
        editableShareText || editedReport.shareText,
      );
    } catch (err) {
      console.error("[poster share]", err);
      onNotify("分享失败：" + (err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function copyShareText(text = editableShareText || editedReport.shareText) {
    try {
      await navigator.clipboard.writeText(text);
      onNotify("已复制分享文案");
    } catch {
      onNotify("复制失败，已展示原文");
      window.alert(text);
    }
  }

  async function publishShare() {
    if (!editedReport.factCheck.ok) {
      onNotify(`事实校验未通过：${editedReport.factCheck.warnings.join("；")}`);
      return;
    }
    const textWarnings = validatePostchainShareText(
      chapter,
      privacy,
      editableShareText || editedReport.shareText,
    );
    if (textWarnings.length > 0) {
      onNotify(`分享文案需要先处理：${textWarnings.join("；")}`);
      return;
    }
    const share = await savePublicPostchainShareCloud({
      chapter,
      report: editedReport,
      privacy,
      shareText: editableShareText || editedReport.shareText,
    });
    const url = `${window.location.origin}/share?id=${share.id}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      onNotify("分享链接已复制");
    } catch {
      window.alert(url);
    }
    onNotify("已生成发布编辑页");
    window.open(url, "_blank");
  }

  function openAuthDialog() {
    setDraftAuthLevel(authLevel);
    setAuthDialogOpen(true);
  }

  function confirmAuth() {
    const nextReport = buildPostchainReport(chapter, {
      authLevel: draftAuthLevel,
      reportStyle,
      privacy,
    });
    setAuthLevel(draftAuthLevel);
    setAuthorized(true);
    localStorage.setItem(POSTCHAIN_AUTH_KEY, draftAuthLevel);
    void savePostchainConsentCloud(draftAuthLevel, privacy);
    setAuthDialogOpen(false);
    setGenerated(true);
    setPreviewOpen(false);
    setEditableShareText(nextReport.contentVariants[0]?.sections[0]?.text ?? nextReport.shareText);
  }

  if (generated && previewOpen) {
    return (
      <ReportPreviewFlow
        chapter={chapter}
        chapterNo={chapterNo}
        dateStr={dateStr}
        report={editedReport}
        privacy={privacy}
        posterRef={posterRef}
        shareText={editableShareText || editedReport.shareText}
        onShareTextChange={setEditableShareText}
        edits={reportEdits}
        onEditsChange={setReportEdits}
        shareUrl={shareUrl}
        exporting={exporting}
        onExport={exportPoster}
        onNativeShare={nativeSharePoster}
        onCopy={copyShareText}
        onPublish={publishShare}
        onBack={() => setPreviewOpen(false)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {authDialogOpen && (
        <PostchainAuthDialog
          value={draftAuthLevel}
          privacy={privacy}
          onChange={setDraftAuthLevel}
          onPrivacyChange={setPrivacy}
          onCancel={() => setAuthDialogOpen(false)}
          onConfirm={confirmAuth}
        />
      )}
      {exportPickerOpen && (
        <ExportSizeDialog
          exporting={exporting}
          onClose={() => setExportPickerOpen(false)}
          onPick={(type) => {
            setExportPickerOpen(false);
            void exportPoster(type);
          }}
        />
      )}
      {reuseOpen && (
        <ReuseRouteDialog
          title={report.title}
          onClose={() => setReuseOpen(false)}
          onGo={onGo}
          onNotify={onNotify}
        />
      )}

      <PostchainOverviewCard
        chapter={chapter}
        chapterNo={chapterNo}
        dateStr={dateStr}
        report={report}
        authLevel={authLevel}
        privacy={privacy}
      />

      <section className="relative">
        <div className="mb-3 overflow-hidden rounded-[26px] border border-[#dfcfb2] bg-[#f8edcc] text-[var(--ink)]">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="cn-serif text-[12px] text-[#a7833f]">海报预览</div>
              <h2 className="cn-serif text-[19px] mt-0.5">复盘海报</h2>
              <p className="cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)] mt-1">
                先看结果，再决定复制、导出或编辑发布。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex">
              <button
                onClick={() => {
                  const text = report.contentVariants[0]?.sections[0]?.text ?? report.shareText;
                  setEditableShareText(text);
                  void copyShareText(text);
                }}
                disabled={!generated}
                className="min-h-11 rounded-2xl border border-[#ead8d0] bg-white/50 px-3 py-2 cn-serif text-[12px] text-[var(--ink)] disabled:opacity-40"
              >
                <Copy size={14} strokeWidth={1.8} />
                复制文案
              </button>
              <button
                onClick={() => setExportPickerOpen(true)}
                disabled={!generated || exporting}
                className="min-h-11 rounded-2xl border border-[#ead8d0] bg-white/50 px-3 py-2 cn-serif text-[12px] text-[var(--ink)] disabled:opacity-40"
              >
                <Download size={14} strokeWidth={1.8} />
                {exporting ? "导出中…" : "导出图片"}
              </button>
              <button
                onClick={() => openPreview()}
                className="min-h-11 rounded-2xl bg-[#6f5850] px-3 py-2 cn-serif text-[12px] text-[#ffffff] shadow-[0_14px_32px_-24px_rgba(61,53,48,0.42)]"
              >
                <Edit3 size={14} strokeWidth={1.8} />
                编辑发布
              </button>
            </div>
          </div>
        </div>

        {generated ? (
          <PostchainPoster
            refEl={posterRef}
            chapter={chapter}
            chapterNo={chapterNo}
            dateStr={dateStr}
            report={report}
            privacy={privacy}
            shareText={
              editableShareText || report.contentVariants[0]?.sections[0]?.text || report.shareText
            }
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 min-h-[360px] flex items-center justify-center text-center px-8">
            <div>
              <div className="display text-[11px] tracking-[0.35em] text-[var(--ink-soft)]">
                WAITING
              </div>
              <div className="cn-serif text-[15px] text-[var(--ink)] mt-2">
                选择路线记录后生成一张今日故事海报
              </div>
            </div>
          </div>
        )}
      </section>

      {generated && (
        <section className="grid gap-3">
          <div className="rounded-[24px] border border-[#ded2bb] bg-[#fffaf2] p-4">
            <div className="cn-serif text-[16px] text-[var(--ink)]">复盘详情</div>
            <p className="mt-1 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
              三行诗用于海报主文案，分享文案用于复制到社交平台，结尾句用于报告收束。
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setReuseOpen(true)}
                className="min-h-10 rounded-2xl bg-[#6f5850] cn-serif text-[12px] text-[#ffffff]"
              >
                再走一次
              </button>
              <button
                onClick={() => {
                  setDetailsOpen((value) => !value);
                  onNotify(detailsOpen ? "已收起完整记录" : "已展开完整记录");
                }}
                className="min-h-10 rounded-2xl border border-[#ead8d0] bg-white/55 cn-serif text-[12px] text-[var(--ink)]"
              >
                {detailsOpen ? "收起完整记录" : "展开完整记录"}
              </button>
            </div>
          </div>
          <div className="rounded-[28px] border border-[#ded2bb] bg-[#fffaf2] p-4 shadow-[0_20px_60px_-50px_rgba(61,53,48,0.65)]">
            <div className="display text-[10px] tracking-[0.3em] text-[var(--accent)]">
              复用路线
            </div>
            <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-3">
              <div>
                <h3 className="cn-serif text-[19px] leading-snug text-[var(--ink)]">
                  {report.primaryCta.title}
                </h3>
                <p className="cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)] mt-1">
                  {report.primaryCta.body}
                </p>
              </div>
              <button
                onClick={() => setReuseOpen(true)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6f5850] text-[#ffffff]"
              >
                <WandSparkles size={18} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            {report.recommendedNextActions.map((action, index) => (
              <div
                key={action.title}
                className={`rounded-[22px] border px-3 py-3 ${
                  index === 0
                    ? "border-[#cfb267] bg-[#f8edcc]"
                    : "border-[var(--border)] bg-[var(--card)]/70"
                }`}
              >
                <div className="cn-serif text-[13px] text-[var(--ink)]">{action.title}</div>
                <div className="cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)] mt-0.5">
                  {action.body}
                </div>
              </div>
            ))}
          </div>

          {detailsOpen && <FactCheckPanel report={report} />}
        </section>
      )}

      <PrivacySummary authLevel={authLevel} privacy={privacy} onOpen={openAuthDialog} />
    </div>
  );
}

function ReportPreviewFlow({
  chapter,
  chapterNo,
  dateStr,
  report,
  privacy,
  posterRef,
  shareText,
  onShareTextChange,
  edits,
  onEditsChange,
  shareUrl,
  exporting,
  onExport,
  onNativeShare,
  onCopy,
  onPublish,
  onBack,
}: {
  chapter: ArchivedChapter;
  chapterNo: number;
  dateStr: string;
  report: PostchainReport;
  privacy: PostchainPrivacySettings;
  posterRef: React.RefObject<HTMLDivElement | null>;
  shareText: string;
  onShareTextChange: (value: string) => void;
  edits: ReportEdits;
  onEditsChange: (value: ReportEdits) => void;
  shareUrl: string;
  exporting: boolean;
  onExport: (type?: "image/png" | "image/jpeg") => void;
  onNativeShare: () => void;
  onCopy: () => void;
  onPublish: () => void;
  onBack: () => void;
}) {
  const setEdit = <K extends keyof ReportEdits>(key: K, value: ReportEdits[K]) =>
    onEditsChange({ ...edits, [key]: value });
  const storyFragments = edits.storyFragments ?? report.storyFragments;
  const [selectedFormat, setSelectedFormat] = useState<PostchainContentFormat>(
    report.contentVariants[0]?.format ?? "self_expression",
  );
  const selectedVariant =
    report.contentVariants.find((variant) => variant.format === selectedFormat) ??
    report.contentVariants[0];
  const shareTextRisks = analyzePostchainTextRisks(chapter, privacy, shareText);
  const formatLabels: Record<PostchainContentFormat, string> = {
    self_expression: "自我表达",
    route_spread: "路线传播",
  };
  const generatedText = selectedVariant?.sections[0]?.text ?? report.shareText;
  function applyVariant() {
    if (!selectedVariant) return;
    onShareTextChange(generatedText);
  }
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
              报告预览
            </div>
            <h2 className="cn-serif text-[19px] text-[var(--ink)] mt-1">编辑并发布这份路线报告</h2>
          </div>
          <button onClick={onBack} className="btn-ghost min-h-10 text-[12px] px-3 py-1.5">
            返回设置
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
              <FileText size={13} strokeWidth={1.8} />
              分享方向
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {report.contentVariants.map((variant) => (
                <button
                  key={variant.format}
                  onClick={() => setSelectedFormat(variant.format)}
                  className={`min-h-10 cn-serif text-[11px] px-2 py-1.5 rounded-xl border transition ${
                    selectedFormat === variant.format
                      ? "bg-[#6f5850] text-[#ffffff] border-[#6f5850]"
                      : "bg-[var(--card)] text-[var(--ink-soft)] border-[var(--border)]"
                  }`}
                >
                  {formatLabels[variant.format]}
                </button>
              ))}
            </div>
            <p className="cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)] mt-2">
              选择一种分享方向，加入图片报告后，会显示在三行诗下面。
            </p>
            {selectedVariant && (
              <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/45 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="cn-serif text-[13px] text-[var(--ink)]">
                      {selectedVariant.title}
                    </div>
                    <p className="cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)] mt-1 whitespace-pre-line">
                      {selectedVariant.body}
                    </p>
                  </div>
                  <button
                    onClick={applyVariant}
                    className="btn-ghost min-h-10 text-[11px] px-3 py-1.5 shrink-0"
                  >
                    <ImageIcon size={14} strokeWidth={1.8} />
                    加入图片报告
                  </button>
                </div>
                <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink)] mt-3">
                  {generatedText}
                </p>
                {selectedVariant.riskWarnings.length > 0 && (
                  <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                    {selectedVariant.riskWarnings.map((warning) => (
                      <div key={warning} className="cn-serif text-[11px] text-amber-700">
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
              <Edit3 size={13} strokeWidth={1.8} />
              海报文案
            </div>
            <textarea
              value={shareText}
              onChange={(e) => onShareTextChange(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2.5 cn-serif text-[13px] leading-relaxed text-[var(--ink)] resize-none"
            />
          </div>
          {shareTextRisks.length > 0 && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2">
              <div className="cn-serif text-[12px] text-amber-800">内容风险提示</div>
              <div className="mt-1 grid gap-1">
                {shareTextRisks.map((risk, index) => (
                  <div
                    key={`${risk.label}-${index}`}
                    className="cn-serif text-[11px] leading-relaxed text-amber-700"
                  >
                    图片报告文案 · {risk.label}：{risk.detail}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button onClick={onCopy} className="btn-ghost min-h-11 justify-center text-[12px]">
              <Copy size={14} strokeWidth={1.8} />
              复制文案
            </button>
            <button
              onClick={() => onExport("image/png")}
              disabled={exporting}
              className="btn-soft min-h-11 justify-center text-[12px]"
            >
              <Download size={14} strokeWidth={1.8} />
              {exporting ? "导出中…" : "导出 PNG"}
            </button>
            <button
              onClick={() => onExport("image/jpeg")}
              disabled={exporting}
              className="btn-ghost min-h-11 justify-center text-[12px]"
            >
              <Download size={14} strokeWidth={1.8} />
              导出 JPG
            </button>
            <button
              onClick={onNativeShare}
              disabled={exporting}
              className="btn-ghost min-h-11 justify-center text-[12px]"
            >
              <Share2 size={14} strokeWidth={1.8} />
              系统分享
            </button>
            <button
              onClick={onPublish}
              className="btn-soft col-span-2 min-h-12 justify-center text-[12px]"
            >
              <Send size={15} strokeWidth={1.8} />
              生成分享页
            </button>
          </div>
          {shareUrl && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-3 grid grid-cols-[88px_1fr] gap-3 items-center">
              <img
                src={qrSvgDataUrl(shareUrl)}
                alt="分享二维码"
                className="w-[88px] h-[88px] rounded-xl border border-[var(--border)] bg-white"
              />
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 display text-[9px] tracking-[0.3em] text-[var(--ink-soft)]">
                  <QrCode size={13} strokeWidth={1.8} />
                  QR · 分享码
                </div>
                <div className="cn-serif text-[11px] text-[var(--ink)] mt-1 break-all">
                  {shareUrl}
                </div>
              </div>
            </div>
          )}
          <FactCheckPanel report={report} />
        </div>
      </section>

      <PostchainPoster
        refEl={posterRef}
        chapter={chapter}
        chapterNo={chapterNo}
        dateStr={dateStr}
        report={report}
        privacy={privacy}
        shareText={shareText}
      />

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="inline-flex items-center gap-1.5 display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
          <RouteIcon size={14} strokeWidth={1.8} />
          路线预览 · 已完成地点
        </div>
        <div className="mt-3 grid gap-2 pb-4">
          {report.completedNodes.concat(report.incompleteNodes).map((node) => (
            <div
              key={`${node.order}-${node.displayName}`}
              className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2"
            >
              <div className="cn-serif text-[13px] text-[var(--ink)]">
                {node.order}. {node.displayName}
              </div>
              <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-0.5">
                {node.locationType}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PostchainAuthDialog({
  value,
  privacy,
  onChange,
  onPrivacyChange,
  onCancel,
  onConfirm,
}: {
  value: PostchainAuthLevel;
  privacy: PostchainPrivacySettings;
  onChange: (value: PostchainAuthLevel) => void;
  onPrivacyChange: (value: PostchainPrivacySettings) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [detailLevel, setDetailLevel] = useState<PostchainAuthLevel | null>(null);
  const options: Array<{
    value: PostchainAuthLevel;
    title: string;
    desc: string;
  }> = [
    {
      value: "basic",
      title: "基础数据权限",
      desc: "仅使用路线完成数据，生成基础路线回顾。",
    },
    {
      value: "personal",
      title: "标准授权",
      desc: "使用本次点位、品类、照片、随笔和心情记录生成个性报告。",
    },
    {
      value: "full",
      title: "高级授权",
      desc: "使用完整本次记录，并预留订单金额、优惠和历史偏好数据位。",
    },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] fade-up"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onCancel}
          aria-label="关闭"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--ink-soft)]"
        >
          <X size={18} strokeWidth={1.8} />
        </button>
        <div className="inline-flex items-center gap-1.5 display text-[10px] tracking-[0.35em] text-[var(--ink-soft)] pr-12">
          <ShieldCheck size={14} strokeWidth={1.8} />
          隐私设置
        </div>
        <h3 className="cn-serif text-[20px] text-[var(--ink)] mt-1">生成今日出行总结</h3>
        <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink-soft)] mt-2">
          为了生成更准确的路线总结，系统会按你选择的范围使用本次路线完成记录。订单金额等敏感信息默认隐藏，未授权的数据不会出现在分享内容中。
        </p>

        <div className="mt-4 grid gap-2">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <div key={option.value} className="grid gap-2">
                <button
                  onClick={() => {
                    onChange(option.value);
                    setDetailLevel(option.value);
                  }}
                  className={`min-h-[76px] text-left rounded-2xl border px-4 py-3 transition ${
                    active
                      ? "bg-[#6f5850] text-[#ffffff] border-[#6f5850]"
                      : "bg-[var(--card)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--muted)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="cn-serif text-[14px]">{option.title}</div>
                      <div
                        className={`cn-serif text-[12px] mt-0.5 ${active ? "opacity-75" : "text-[var(--ink-soft)]"}`}
                      >
                        {option.desc}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 cn-serif text-[11px] shrink-0 ${active ? "opacity-70" : "text-[var(--ink-soft)]"}`}
                    >
                      设置展示内容
                      <SlidersHorizontal size={13} strokeWidth={1.8} />
                    </span>
                  </div>
                </button>
                {detailLevel === option.value && (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/45 p-3">
                    <div className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)]">
                      ALLOWED FIELDS · 允许展示内容
                    </div>
                    <p className="cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)] mt-1">
                      这些开关只影响对外报告和海报展示，底层仍会作为事实校验数据源使用。
                    </p>
                    <div className="mt-3">
                      <PrivacySettingsPanel value={privacy} onChange={onPrivacyChange} compact />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost min-h-11">
            取消
          </button>
          <button onClick={onConfirm} className="btn-soft min-h-11">
            <CheckCircle2 size={16} strokeWidth={1.8} />
            同意并生成
          </button>
        </div>
      </div>
    </div>
  );
}

function PrivacySettingsPanel({
  value,
  onChange,
  compact = false,
}: {
  value: PostchainPrivacySettings;
  onChange: (value: PostchainPrivacySettings) => void;
  compact?: boolean;
}) {
  const items: Array<[keyof PostchainPrivacySettings, string, string]> = [
    ["showMerchantNames", "展示商户名", "关闭后以地点名/品类替代。"],
    ["showVisitTime", "展示具体时间", "关闭后不显示打卡时间。"],
    ["showLocation", "展示城市/地点", "关闭后隐藏城市位置。"],
    ["showPhotos", "展示照片", "关闭后海报不使用打卡照片。"],
    ["showAmount", "展示金额", "订单未接入，先预留开关。"],
    ["showDiscount", "展示优惠", "券包未接入，先预留开关。"],
  ];

  return (
    <div>
      {!compact && (
        <div className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
          PRIVACY
        </div>
      )}
      <div
        className={`${compact ? "grid gap-2" : "rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 grid gap-2"}`}
      >
        {items.map(([key, title, desc]) => (
          <label
            key={key}
            className="flex min-h-11 items-start gap-3 rounded-xl px-1 py-1 cn-serif text-[12px] text-[var(--ink)]"
          >
            <input
              type="checkbox"
              checked={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
              className="mt-1 h-4 w-4 accent-[var(--ink)]"
            />
            <span>
              <span className="block text-[13px]">{title}</span>
              <span className="block text-[11px] text-[var(--ink-soft)] mt-0.5">{desc}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function buildThreeLinePoem(report: PostchainReport) {
  const source = [...report.poemLines, report.flexLine, report.ending, report.nextHook].filter(
    Boolean,
  );
  const lines = source.slice(0, 3);
  while (lines.length < 3) lines.push(report.title);
  return lines;
}

function naturalShareText(chapter: ArchivedChapter, report: PostchainReport) {
  const completed = chapter.journey.scenes.filter((scene) =>
    chapter.completedSceneOrders.includes(scene.order),
  );
  const city = chapter.city || "这座城市";
  const stops = completed
    .map((scene) => scene.location_name || scene.scene_name)
    .filter(Boolean)
    .slice(0, 3);
  const route = stops.length > 1 ? `从${stops.join("，到")}` : `在${stops[0] || city}`;
  const emotion = report.unlockedKeywords.slice(0, 2).join("、") || "慢下来";
  const text = `今天在${city}走了一条很轻的路线，${route}。没有赶路，也不是打卡，更像是给自己留出一段${emotion}的时间。城市被拆成几个很小的停顿点，反而更容易记住。`;
  return text.length > 150 ? `${text.slice(0, 146)}…` : text;
}

function PostchainPoster({
  refEl,
  chapter,
  chapterNo,
  dateStr,
  report,
  privacy,
  shareText,
}: {
  refEl: React.RefObject<HTMLDivElement | null>;
  chapter: ArchivedChapter;
  chapterNo: number;
  dateStr: string;
  report: PostchainReport;
  privacy: PostchainPrivacySettings;
  shareText: string;
}) {
  const coverPhoto = report.photoUrls[0] || imageForChapter(chapter);
  const poemLines = buildThreeLinePoem(report);
  const posterShareText = naturalShareText(chapter, report);
  const timelineScenes = completedScenes(chapter).slice(0, 4);
  return (
    <article
      ref={refEl}
      className="relative overflow-hidden rounded-[30px] border border-white/75 bg-[#fffaf2] shadow-[0_30px_80px_-44px_rgba(0,0,0,0.48)]"
    >
      <div
        className="relative min-h-[720px] overflow-hidden p-4"
        style={
          coverPhoto
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(62,38,33,0.18) 0%, rgba(62,38,33,0.55) 42%, rgba(255,244,236,0.96) 72%, rgba(255,250,242,0.98) 100%), url(${coverPhoto})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
              }
            : {
                background: `linear-gradient(180deg, rgba(255,244,236,0.28) 0%, rgba(255,250,242,0.98) 70%), linear-gradient(135deg, ${chapter.card.colors[0]}, ${chapter.card.colors[1]})`,
              }
        }
      >
        <div className="min-h-[292px] rounded-[26px] border border-white/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.02)_100%)] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]">
          <div className="flex items-start justify-between gap-3">
            <div className="rounded-full border border-white/30 bg-white/18 px-3 py-1 cn-serif text-[10px] backdrop-blur">
              CH.{String(chapterNo).padStart(2, "0")} · {dateStr}
            </div>
            <div className="rounded-full border border-white/30 bg-white/18 px-3 py-1 cn-serif text-[10px] backdrop-blur">
              海报封面
            </div>
          </div>
          <div className="mt-24 max-w-[88%]">
            <div className="cn-serif text-[12px] text-white/82">
              {privacy.showLocation && chapter.city ? chapter.city : "城市路线"} · 复盘海报
            </div>
            <h3 className="mt-2 cn-serif text-[28px] leading-tight text-white drop-shadow">
              {report.identityBadge}
            </h3>
            <div className="mt-3 grid max-w-[300px] grid-cols-3 gap-1.5">
              {[
                [`${Math.round(report.completionRate * 100)}%`, "完成度"],
                [`${report.completedNodes.length}`, "完成地点"],
                [`${timelineScenes.length}`, "时间段"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-[15px] border border-white/28 bg-white/20 px-2 py-2 text-center backdrop-blur"
                >
                  <div className="display text-[17px] leading-none text-white">{value}</div>
                  <div className="mt-0.5 cn-serif text-[9px] text-white/80">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[26px] border border-white/78 bg-[#fffaf2]/88 p-4 shadow-[0_20px_52px_-42px_rgba(61,53,48,0.65)] backdrop-blur">
          <div className="cn-serif text-[12px] text-[#8f5f68]">三行诗</div>
          <div className="mt-2 space-y-1">
            {poemLines.map((line, index) => (
              <p
                key={`${line}-${index}`}
                className="cn-serif text-[15px] leading-relaxed text-[var(--ink)]"
              >
                {line}
              </p>
            ))}
          </div>
          <div className="mt-3 rounded-[20px] border border-[#ead8d0] bg-white/58 px-3 py-3">
            <div className="cn-serif text-[12px] text-[#8f5f68]">路线时间线</div>
            <div className="mt-3 space-y-3">
              {timelineScenes.map((scene, index) => {
                const rec = chapter.sceneRecords?.[scene.order];
                const completedAt = rec?.completedAt ? new Date(rec.completedAt) : null;
                const timeLabel = completedAt
                  ? `${String(completedAt.getHours()).padStart(2, "0")}:${String(completedAt.getMinutes()).padStart(2, "0")}`
                  : index === 0
                    ? "08:30"
                    : index === 1
                      ? "12:00"
                      : "18:30";
                return (
                  <div key={scene.order} className="grid grid-cols-[48px_1fr] gap-3">
                    <div className="cn-serif text-[11px] text-[#8f5f68]">{timeLabel}</div>
                    <div className="border-l border-[#ead8d0] pl-3">
                      <div className="cn-serif text-[13px] text-[var(--ink)]">
                        {scene.scene_name}
                      </div>
                      <p className="mt-0.5 line-clamp-2 cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)]">
                        {rec?.note || scene.persona_narrative}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-3 rounded-[20px] border border-[#ead8d0] bg-white/54 px-3 py-3">
            <div className="cn-serif text-[12px] text-[#8f5f68]">今日总结</div>
            <p className="mt-1 cn-serif text-[12px] leading-relaxed text-[var(--ink)]">
              {shareText.length > 150 ? posterShareText : shareText || posterShareText}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ============ 收藏馆：地点 / 活动 ============ */
type LibKind = "place" | "activity";

function applyLibFilters(list: LibraryEntry[], filters: MeFilters): LibraryEntry[] {
  let out = list.filter((e) => {
    if (filters.onlyPhoto && !e.hasPhoto) return false;
    if (filters.onlyNote && !e.hasNote) return false;
    if (filters.minLevel > 0 && e.level < filters.minLevel) return false;
    return true;
  });
  if (filters.sort === "recent") out = [...out].sort((a, b) => b.lastAt - a.lastAt);
  else if (filters.sort === "enhanced")
    out = [...out].sort((a, b) => b.level - a.level || b.visits - a.visits);
  // "order" keeps the default sort from buildLibrary (by level desc)
  return out;
}

function LibraryView({
  library,
  sagas,
  empty,
  onGo,
  onNotify,
  filters,
  mode,
}: {
  library: ReturnType<typeof buildLibrary>;
  sagas: ArchivedChapter[];
  empty: boolean;
  onGo: () => void;
  onNotify: (message: string) => void;
  filters: MeFilters;
  mode: AssetMode;
}) {
  const [open, setOpen] = useState<{ entry: LibraryEntry; kind: LibKind } | null>(null);
  const [showAllPlaces, setShowAllPlaces] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const places = useMemo(() => applyLibFilters(library.places, filters), [library.places, filters]);
  const activities = useMemo(
    () => applyLibFilters(library.activities, filters),
    [library.activities, filters],
  );

  if (empty) return <EmptyState onGo={onGo} />;
  if (mode === "longterm") {
    const starPlaces = showAllPlaces ? places : places.slice(0, 5);
    const actionSeeds = showAllActivities ? activities : activities.slice(0, 5);
    const repeatedPlaces = places.filter((place) => place.visits > 1).length;
    return (
      <>
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-[30px] border border-[var(--border)] bg-[#fffaf2] shadow-[0_24px_70px_-52px_rgba(61,53,48,0.62)]">
            <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,#f0eadb_0%,rgba(255,250,242,0)_100%)]" />
            <div className="relative p-4">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/65 px-3 py-1.5 display text-[9px] tracking-[0.3em] text-[var(--ink-soft)]">
                <MapPinned size={13} strokeWidth={1.8} />
                ROUTE ATLAS
              </div>
              <h2 className="cn-serif text-[21px] leading-snug text-[var(--ink)] mt-2">
                地点、活动与路线资产库
              </h2>
              <p className="cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)] mt-1">
                这里保存你走过的地点、完成过的活动，以及可以再次使用的路线记录。
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MetricCard
                  value={places.length}
                  label="地点资产"
                  detail={`${repeatedPlaces} 个复访`}
                />
                <MetricCard value={activities.length} label="活动资产" detail="完成过" />
                <MetricCard value={sagas.length} label="路线记录" detail="可追溯" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-1.5 cn-serif text-[11px] text-[var(--ink)]">
                {[
                  { label: "查看全部地点", onClick: () => setShowAllPlaces(true) },
                  { label: "查看全部活动", onClick: () => setShowAllActivities(true) },
                  {
                    label: "查看全部路线",
                    onClick: () => setRouteOpen(true),
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    className="min-h-9 rounded-full border border-[var(--border)] bg-white/70 px-2 py-1.5 text-center shadow-[0_10px_24px_-20px_rgba(61,53,48,0.45)]"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setMapOpen(true)}
                  className="min-h-9 rounded-full border border-[#ead8d0] bg-white/62 px-3 cn-serif text-[11px] text-[var(--ink)]"
                >
                  查看地图分布
                </button>
                <button
                  onClick={() => setIncompleteOpen(true)}
                  className="min-h-9 rounded-full border border-[#ead8d0] bg-white/62 px-3 cn-serif text-[11px] text-[var(--ink)]"
                >
                  未完善资产
                </button>
              </div>
            </div>
          </section>

          {mapOpen && (
            <AssetMapPanel
              places={places}
              sagas={sagas}
              onClose={() => setMapOpen(false)}
              onNotify={onNotify}
            />
          )}
          {incompleteOpen && (
            <IncompleteAssetsPanel
              places={places}
              activities={activities}
              sagas={sagas}
              onClose={() => setIncompleteOpen(false)}
              onNotify={onNotify}
            />
          )}
          {routeOpen && (
            <RouteRecordPanel
              sagas={sagas}
              onClose={() => setRouteOpen(false)}
              onGo={onGo}
              onNotify={onNotify}
            />
          )}

          <Section
            title={showAllPlaces ? "全部地点资产" : "高频地点资产"}
            subtitle={`PLACES · ${starPlaces.length}/${places.length}`}
          >
            <div className="grid min-w-0 gap-2.5">
              {starPlaces.map((place) => (
                <LibCard
                  key={place.name}
                  entry={place}
                  kind="place"
                  onOpen={() => setOpen({ entry: place, kind: "place" })}
                  onReuse={() => onNotify("已加入下次路线")}
                />
              ))}
            </div>
            {places.length > 5 && (
              <button
                onClick={() => setShowAllPlaces((value) => !value)}
                className="mt-3 btn-ghost w-full justify-center text-[12px]"
              >
                {showAllPlaces ? "收起地点资产" : `查看全部 ${places.length} 个地点资产`}
              </button>
            )}
          </Section>

          <Section
            title={showAllActivities ? "全部活动资产" : "活动收藏"}
            subtitle={`ACTIONS · ${actionSeeds.length}/${activities.length}`}
          >
            <div className="grid gap-2.5">
              {actionSeeds.map((activity) => (
                <LibCard
                  key={activity.name}
                  entry={activity}
                  kind="activity"
                  onOpen={() => setOpen({ entry: activity, kind: "activity" })}
                  onReuse={() => onNotify("已加入待安排活动")}
                />
              ))}
            </div>
            {activities.length > 5 && (
              <button
                onClick={() => setShowAllActivities((value) => !value)}
                className="mt-3 btn-ghost w-full justify-center text-[12px]"
              >
                {showAllActivities ? "收起行动素材" : `查看全部 ${activities.length} 个行动素材`}
              </button>
            )}
          </Section>
        </div>

        {open && (
          <LibraryDetail
            entry={open.entry}
            kind={open.kind}
            sagas={sagas}
            onClose={() => setOpen(null)}
          />
        )}
      </>
    );
  }
  return (
    <>
      <div className="space-y-7">
        <Section title="地点收藏" subtitle={`PLACES · ${places.length}/${library.places.length}`}>
          <div className="grid grid-cols-1 gap-2.5">
            {places.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 p-4 text-center cn-serif text-[11px] text-[var(--ink-soft)]">
                没有符合条件的地点
              </div>
            ) : (
              places.map((p) => (
                <LibCard
                  key={p.name}
                  entry={p}
                  kind="place"
                  onOpen={() => setOpen({ entry: p, kind: "place" })}
                  onReuse={() => onNotify("已加入下次路线")}
                />
              ))
            )}
          </div>
        </Section>
        <Section
          title="活动收藏"
          subtitle={`ACTIVITIES · ${activities.length}/${library.activities.length}`}
        >
          <div className="grid grid-cols-1 gap-2.5">
            {activities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 p-4 text-center cn-serif text-[11px] text-[var(--ink-soft)]">
                没有符合条件的活动
              </div>
            ) : (
              activities.map((a) => (
                <LibCard
                  key={a.name}
                  entry={a}
                  kind="activity"
                  onOpen={() => setOpen({ entry: a, kind: "activity" })}
                  onReuse={() => onNotify("已加入待安排活动")}
                />
              ))
            )}
          </div>
        </Section>
      </div>

      {open && (
        <LibraryDetail
          entry={open.entry}
          kind={open.kind}
          sagas={sagas}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <div className="display text-[10px] tracking-[0.4em] text-[var(--ink-soft)]">
          {subtitle}
        </div>
        <h2 className="cn-serif text-[17px] text-[var(--ink)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CityPreferenceView({
  profile,
  memory,
  rangeLabel,
  empty,
  onGo,
  onNotify,
}: {
  profile: ReturnType<typeof buildCityPreferenceProfile>;
  memory: DmMemorySnapshot | null;
  rangeLabel: string;
  empty: boolean;
  onGo: () => void;
  onNotify: (message: string) => void;
}) {
  const [expandedInsight, setExpandedInsight] = useState(false);
  if (empty) return <EmptyState onGo={onGo} />;
  const sourceLabel =
    profile.memorySource === "mixed"
      ? "云端画像 + 本地连载"
      : profile.memorySource === "cloud"
        ? "云端画像"
        : "本地连载";
  const evidence = [
    `${rangeLabel}完成 ${profile.periodStats.totalRoutes} 次出门，其中周末 ${profile.periodStats.weekendRoutes} 次。`,
    profile.topCategories[0] ? `最高频品类为 ${profile.topCategories[0]}。` : "",
    profile.periodStats.cityStats[0]
      ? `高频城市为 ${profile.periodStats.cityStats.slice(0, 3).join("、")}。`
      : "",
    profile.emotionTags.length
      ? `高频情绪包含 ${profile.emotionTags.slice(0, 4).join("、")}。`
      : "",
  ].filter(Boolean);
  const behaviorTags = Array.from(new Set([profile.pace, "慢停留", "城市漫游"])).filter(Boolean);
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d8c4a3] bg-[linear-gradient(135deg,#fff6df_0%,#efe0c4_100%)] text-[var(--ink)] p-4 shadow-[0_22px_60px_-48px_rgba(61,53,48,0.68)]">
        <div className="display text-[10px] tracking-[0.35em] text-[#8f5f68]">
          CITY PROFILE · {rangeLabel}
        </div>
        <h2 className="cn-serif text-[22px] leading-snug mt-2">{profile.persona}</h2>
        <p className="cn-serif text-[12.5px] leading-relaxed text-[var(--ink-soft)] mt-2">
          {expandedInsight
            ? profile.periodStats.summary
            : `${profile.periodStats.summary.slice(0, 96)}${profile.periodStats.summary.length > 96 ? "…" : ""}`}
        </p>
        <button
          onClick={() => setExpandedInsight((value) => !value)}
          className="mt-2 cn-serif text-[11px] text-[#6f5850] underline underline-offset-4"
        >
          {expandedInsight ? "收起完整解读" : "展开完整解读"}
        </button>
        <div className="mt-3 rounded-2xl border border-[#dfcfb2] bg-white/52 px-3 py-2">
          <div className="cn-serif text-[12px] text-[var(--ink)]">判断依据</div>
          <div className="mt-1 grid gap-1">
            {evidence.map((item) => (
              <div
                key={item}
                className="cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-2">
          来源：{sourceLabel}
          {memory ? ` · 累计 ${memory.total_runs} 次云端记录` : ""}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <MetricCard
          value={profile.periodStats.totalRoutes}
          label="出门次数"
          detail={`其中周末 ${profile.periodStats.weekendRoutes} 次`}
        />
        <MetricCard
          value={profile.periodStats.completedNodes}
          label="点亮地点"
          detail={`补充记录 ${profile.periodStats.enhancedNodes} 条`}
        />
        <PreferenceCard title="常去城市" items={profile.periodStats.cityStats} empty="暂无城市" />
        <PreferenceCard title="路线节奏" items={[profile.pace]} empty="暂无节奏" />
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="cn-serif text-[15px] text-[var(--ink)]">本期变化</div>
        <div className="mt-2 grid gap-2">
          {memory ? (
            [
              `周末出门占比为 ${profile.periodStats.weekendRoutes}/${profile.periodStats.totalRoutes}`,
              profile.topCategories[0] ? `${profile.topCategories[0]} 仍是最高频品类` : "",
              profile.emotionTags[0]
                ? `情绪关键词集中在 ${profile.emotionTags.slice(0, 3).join("、")}`
                : "",
            ]
              .filter(Boolean)
              .map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/45 px-3 py-2 cn-serif text-[12px] text-[var(--ink)]"
                >
                  {item}
                </div>
              ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)]/35 px-3 py-3 cn-serif text-[12px] text-[var(--ink-soft)]">
              暂无上一周期数据，继续完成路线后将生成变化趋势。
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
              ROUTE TASTE · 路线偏好
            </div>
            <p className="cn-serif text-[14px] leading-relaxed text-[var(--ink)] mt-2">
              {profile.trendSummary}
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center display text-[18px] text-[var(--accent)] shrink-0">
            {profile.topCategories.length || 0}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <PreferenceCard title="偏好品类" items={profile.topCategories} empty="暂无品类" />
          <PreferenceCard title="常去商圈/区域" items={profile.topDistricts} empty="暂无区域" />
        </div>
        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
          {profile.paceReason}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="cn-serif text-[15px] text-[var(--ink)]">关键词分类</div>
        <div className="mt-3 grid gap-2">
          <TagGroup title="情绪关键词" tags={profile.emotionTags} />
          <TagGroup title="场景关键词" tags={[...profile.topCategories, ...profile.topDistricts]} />
          <TagGroup title="行为关键词" tags={behaviorTags} />
        </div>
      </section>

      <section className="rounded-3xl border border-[#d8c4a3] bg-[#fffaf2] p-4 overflow-hidden shadow-[0_22px_60px_-46px_rgba(61,53,48,0.62)]">
        <div className="rounded-2xl border border-[#dfcfb2] bg-[#f8edcc] text-[var(--ink)] px-4 py-3 flex items-start justify-between gap-3">
          <div>
            <div className="display text-[10px] tracking-[0.3em] text-[#8f5f68]">
              ROUTE ASSETS · 长期路线资产
            </div>
            <h3 className="cn-serif text-[19px] mt-1">
              已沉淀 {profile.routeAssetReports.length} 条路线资产
            </h3>
          </div>
          <div className="display text-[30px] leading-none text-[#8f5f68]">
            {profile.routeAssetReports.length}
          </div>
        </div>
        <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink)] mt-3 px-1">
          {profile.routeAssetSummary}
        </p>
        <div className="mt-4 grid gap-3">
          {profile.routeAssetReports.map((asset, index) => (
            <RouteAssetReportCard
              key={asset.id}
              asset={asset}
              index={index}
              onReuse={onGo}
              onNotify={onNotify}
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-[#d8c4a3] bg-[#fffaf2]">
        <div className="bg-[#f8edcc] px-4 py-4 text-[var(--ink)]">
          <div className="display text-[10px] tracking-[0.3em] text-[#8f5f68]">NEXT ROUTE</div>
          <h3 className="cn-serif text-[20px] leading-snug mt-2">{profile.nextRouteBrief}</h3>
          <p className="cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)] mt-2">
            {profile.nextRecommendationReason}
          </p>
          <button
            onClick={onGo}
            className="mt-4 min-h-11 w-full rounded-2xl bg-[#6f5850] px-3 cn-serif text-[13px] text-[#ffffff]"
          >
            生成这条推荐路线
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          {[
            ...profile.recommendationProof,
            ...profile.categoryReasons.slice(0, 2),
            ...profile.districtReasons.slice(0, 1),
          ].map((proof) => (
            <div
              key={proof}
              className="mx-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)]"
            >
              {proof}
            </div>
          ))}
        </div>
        {memory?.disliked_tags?.length ? (
          <div className="mx-4 mt-3 pb-4 cn-serif text-[11px] text-[var(--ink-soft)]">
            会避开的标签：{memory.disliked_tags.join("、")}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function PreferenceCard({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="display text-[9px] tracking-[0.28em] text-[var(--ink-soft)]">{title}</div>
      <div className="mt-2 space-y-1">
        {(items.length ? items : [empty]).map((item) => (
          <div key={item} className="cn-serif text-[13px] text-[var(--ink)]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function TagGroup({ title, tags }: { title: string; tags: string[] }) {
  const unique = Array.from(new Set(tags.filter(Boolean))).slice(0, 6);
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/38 px-3 py-2">
      <div className="cn-serif text-[12px] text-[var(--ink)]">{title}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {(unique.length ? unique : ["暂无"]).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[var(--border)] bg-white/70 px-2.5 py-1 cn-serif text-[10.5px] text-[var(--ink-soft)]"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function RouteAssetReportCard({
  asset,
  index,
  onReuse,
  onNotify,
}: {
  asset: ReturnType<typeof buildCityPreferenceProfile>["routeAssetReports"][number];
  index: number;
  onReuse: () => void;
  onNotify: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reuseOpen, setReuseOpen] = useState(false);
  const [primaryEvidence, ...otherEvidence] = asset.evidence;
  const accents = ["#8f5f68", "#8f5f68", "#9b8ea1", "#8f5f68"];
  const accent = accents[index % accents.length];
  return (
    <div className="group overflow-hidden rounded-[24px] border border-[#dfcfb2] bg-[#fffdfa] shadow-[0_18px_54px_-42px_rgba(61,53,48,0.62)]">
      {reuseOpen && (
        <ReuseRouteDialog
          title={asset.title}
          onClose={() => setReuseOpen(false)}
          onGo={onReuse}
          onNotify={onNotify}
        />
      )}
      <div className="px-4 pt-4 pb-3 bg-[linear-gradient(135deg,#fff7e3_0%,#fffdfa_72%)]">
        <div className="flex items-center justify-between gap-3">
          <div className="display text-[9px] tracking-[0.34em]" style={{ color: accent }}>
            ASSET {String(index + 1).padStart(2, "0")}
          </div>
          <div className="h-px flex-1" style={{ backgroundColor: `${accent}44` }} />
          <div className="cn-serif text-[10px] text-[var(--ink)] shrink-0">路线骨架</div>
        </div>
        <h4 className="cn-serif text-[17px] leading-snug text-[var(--ink)] mt-3">{asset.title}</h4>
        <p className="cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)] mt-1.5">
          {asset.subtitle}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["可复用", "来源可追溯", "城市路线"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[#dfcfb2] bg-white/65 px-2 py-0.5 cn-serif text-[10px] text-[var(--ink-soft)]"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <button
            onClick={() => setReuseOpen(true)}
            className="min-h-10 rounded-2xl bg-[#6f5850] px-3 cn-serif text-[12px] text-[#ffffff]"
          >
            再走一次
          </button>
          <button
            onClick={() => setExpanded((value) => !value)}
            className="min-h-10 rounded-2xl border bg-white/70 px-3 cn-serif text-[12px] text-[var(--ink)]"
            style={{ borderColor: `${accent}55` }}
          >
            {expanded ? "收起" : "查看来源记录"}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div
            className="mx-3 mt-3 rounded-2xl border px-3 py-3 bg-white/85"
            style={{ borderColor: `${accent}3d` }}
          >
            <div className="cn-serif text-[12px]" style={{ color: accent }}>
              可复用价值
            </div>
            <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink)] mt-1">
              {asset.shareLine}
            </p>
          </div>

          <div className="px-4 pt-3 pb-4">
            {primaryEvidence && (
              <div
                className="cn-serif text-[11px] leading-relaxed text-[var(--ink)] border-l-2 pl-2"
                style={{ borderColor: accent }}
              >
                {primaryEvidence}
              </div>
            )}
            {otherEvidence.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {otherEvidence.map((item) => (
                  <span
                    key={item}
                    className="cn-serif text-[10px] px-2.5 py-1 rounded-full text-[var(--ink)] border bg-white/80"
                    style={{ borderColor: `${accent}44` }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  value,
  label,
  detail,
}: {
  value: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
      <div className="display text-[24px] leading-none text-[var(--accent)]">{value}</div>
      <div className="cn-serif text-[12.5px] text-[var(--ink)] mt-1">{label}</div>
      <div className="cn-serif text-[10.5px] text-[var(--ink-soft)] mt-0.5">{detail}</div>
    </div>
  );
}

function AssetMapPanel({
  places,
  sagas,
  onClose,
  onNotify,
}: {
  places: LibraryEntry[];
  sagas: ArchivedChapter[];
  onClose: () => void;
  onNotify: (message: string) => void;
}) {
  const cities = Array.from(new Set(sagas.map((saga) => saga.city).filter(Boolean))).slice(0, 4);
  return (
    <AssetPanel title="地图分布" onClose={onClose}>
      <div className="rounded-[22px] border border-[#dfcfb2] bg-[#f8edcc] p-4">
        <div className="grid grid-cols-3 gap-2 cn-serif text-[11px] text-[var(--ink)]">
          <MetricCard value={places.length} label="地点分布" detail="已沉淀" />
          <MetricCard
            value={cities.length || 1}
            label="高频区域"
            detail={cities[0] || "当前城市"}
          />
          <MetricCard value={sagas.length} label="路线轨迹" detail="起点/中转/终点" />
        </div>
        <div className="mt-4 rounded-2xl border border-[#ead8d0] bg-white/55 p-3">
          <div className="cn-serif text-[13px] text-[var(--ink)]">地图资产页占位</div>
          <p className="mt-1 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
            后续可接入真实地图，展示地点分布、高频区域、路线起点、中转点和终点。
          </p>
          <button
            onClick={() => onNotify("已打开地图资产面板")}
            className="mt-3 min-h-9 rounded-full bg-[#6f5850] px-3 cn-serif text-[11px] text-[#ffffff]"
          >
            查看地图分布
          </button>
        </div>
      </div>
    </AssetPanel>
  );
}

function IncompleteAssetsPanel({
  places,
  activities,
  sagas,
  onClose,
  onNotify,
}: {
  places: LibraryEntry[];
  activities: LibraryEntry[];
  sagas: ArchivedChapter[];
  onClose: () => void;
  onNotify: (message: string) => void;
}) {
  const placesNeedPhoto = places.filter((place) => !place.hasPhoto).length;
  const activitiesNeedNote = activities.filter((activity) => !activity.hasNote).length;
  const routesNeedPoster = sagas.filter(
    (saga) => Object.keys(saga.sceneRecords ?? {}).length > 0,
  ).length;
  return (
    <AssetPanel title="未完善资产" onClose={onClose}>
      <div className="grid gap-2">
        {[
          `${placesNeedPhoto} 个地点还没有补充照片`,
          `${activitiesNeedNote} 个活动还没有补充随笔`,
          `${routesNeedPoster} 条路线可以生成复盘海报`,
        ].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[#dfcfb2] bg-white/65 px-3 py-2 cn-serif text-[12px] text-[var(--ink)]"
          >
            {item}
          </div>
        ))}
      </div>
      <button
        onClick={() => onNotify("已进入资产完善流程")}
        className="mt-3 min-h-10 w-full rounded-2xl bg-[#6f5850] cn-serif text-[12px] text-[#ffffff]"
      >
        去完善
      </button>
    </AssetPanel>
  );
}

function RouteRecordPanel({
  sagas,
  onClose,
  onGo,
  onNotify,
}: {
  sagas: ArchivedChapter[];
  onClose: () => void;
  onGo: () => void;
  onNotify: (message: string) => void;
}) {
  return (
    <AssetPanel title="全部路线记录" onClose={onClose}>
      <div className="grid gap-2">
        {sagas.map((saga, index) => {
          const date = new Date(saga.createdAt);
          const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
          const completed = saga.journey.scenes.filter((scene) =>
            saga.completedSceneOrders.includes(scene.order),
          );
          const categories = Array.from(
            new Set(completed.map((scene) => scene.location_type)),
          ).slice(0, 2);
          return (
            <div
              key={saga.chapterId}
              className="rounded-2xl border border-[#dfcfb2] bg-white/65 p-3"
            >
              <div className="cn-serif text-[14px] text-[var(--ink)]">{saga.card.identity}</div>
              <div className="mt-1 cn-serif text-[11px] text-[var(--ink-soft)]">
                CH.{String(sagas.length - index).padStart(2, "0")} · {dateStr} ·{" "}
                {saga.city || "城市"} · {completed.length} 个地点
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full bg-[var(--muted)] px-2 py-0.5 cn-serif text-[10px] text-[var(--ink-soft)]"
                  >
                    {category}
                  </span>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={onGo}
                  className="min-h-9 rounded-2xl bg-[#6f5850] cn-serif text-[11px] text-[#ffffff]"
                >
                  再走一次
                </button>
                <button
                  onClick={() => onNotify("已打开来源记录")}
                  className="min-h-9 rounded-2xl border border-[#ead8d0] bg-white/55 cn-serif text-[11px] text-[var(--ink)]"
                >
                  查看来源记录
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AssetPanel>
  );
}

function AssetPanel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative max-h-[86vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-[#dfcfb2] bg-[#fffaf2] p-5 shadow-[0_30px_80px_-36px_rgba(0,0,0,0.45)] sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white/70 text-[var(--ink-soft)]"
        >
          <X size={16} strokeWidth={1.8} />
        </button>
        <h3 className="mb-4 pr-10 cn-serif text-[19px] text-[var(--ink)]">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function LibCard({
  entry,
  kind,
  onOpen,
  onReuse,
}: {
  entry: LibraryEntry;
  kind: LibKind;
  onOpen: () => void;
  onReuse: () => void;
}) {
  const stars = Math.min(5, Math.max(1, entry.level || 1));
  const lastDate = entry.lastAt ? new Date(entry.lastAt) : null;
  const lastStr = lastDate
    ? `${lastDate.getFullYear()}.${String(lastDate.getMonth() + 1).padStart(2, "0")}.${String(lastDate.getDate()).padStart(2, "0")}`
    : "-";
  const role = kind === "place" ? (entry.visits > 1 ? "常用地点" : "可复用地点") : "可再次安排";
  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-22px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center bg-[var(--muted)] overflow-hidden">
          {kind === "place" ? (
            <VenueIcon kind={detectVenue(entry.type, entry.name)} size={48} />
          ) : (
            <Sparkles size={28} strokeWidth={1.6} className="text-[var(--accent)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="cn-serif text-[14px] text-[var(--ink)] truncate max-w-full">
            {entry.name}
          </div>
          <div className="cn-serif text-[11px] text-[var(--ink-soft)] truncate">
            {entry.type} · 访问 {entry.visits} 次 · 最近 {lastStr}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1 cn-serif text-[10.5px] text-[var(--ink-soft)]">
            <span>关联路线：{Math.max(1, entry.visits)} 条</span>
            <span>常用角色：{role}</span>
          </div>
          {entry.emotions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {entry.emotions.slice(0, 3).map((e) => (
                <span
                  key={e}
                  className="text-[10px] cn-serif px-1.5 py-0.5 rounded-full bg-[var(--muted)] text-[var(--ink-soft)]"
                >
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="rounded-full border border-[var(--border)] bg-[var(--muted)]/50 px-2 py-1 cn-serif text-[10px] text-[var(--ink-soft)]">
            完善度 {stars}/5
          </span>
          <MoreHorizontal size={17} strokeWidth={1.6} className="text-[var(--ink-soft)]" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={onOpen}
          className="min-h-9 rounded-2xl border border-[#ead8d0] bg-white/55 cn-serif text-[11px] text-[var(--ink)]"
        >
          {kind === "place" ? "查看记录" : "查看来源"}
        </button>
        <button
          onClick={onReuse}
          className="min-h-9 rounded-2xl bg-[#6f5850] cn-serif text-[11px] text-[#ffffff]"
        >
          {kind === "place" ? "加入路线" : "再次安排"}
        </button>
      </div>
    </div>
  );
}

interface Appearance {
  chapterId: string;
  chapterNo: number;
  date: Date;
  card: ArchivedChapter["card"];
  city?: string;
  scene: ArchivedChapter["journey"]["scenes"][number];
  rec?: NonNullable<ArchivedChapter["sceneRecords"]>[number];
  enhanced: boolean;
}

function LibraryDetail({
  entry,
  kind,
  sagas,
  onClose,
}: {
  entry: LibraryEntry;
  kind: LibKind;
  sagas: ArchivedChapter[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // 收集所有出现：按时间倒序
  const appearances: Appearance[] = [];
  sagas.forEach((ch, idx) => {
    const chapterNo = sagas.length - idx;
    for (const s of ch.journey.scenes) {
      if (!ch.completedSceneOrders.includes(s.order)) continue;
      const matched =
        kind === "place" ? s.location_name === entry.name : s.action_task === entry.name;
      if (!matched) continue;
      const rec = ch.sceneRecords?.[s.order];
      appearances.push({
        chapterId: ch.chapterId,
        chapterNo,
        date: new Date(rec?.completedAt ?? ch.archivedAt),
        card: ch.card,
        city: ch.city,
        scene: s,
        rec,
        enhanced: !!(rec?.note || rec?.photo),
      });
    }
  });
  appearances.sort((a, b) => b.date.getTime() - a.date.getTime());

  const photos = appearances.filter((a) => a.rec?.photo);
  const lastStr = appearances.length
    ? `${appearances[0].date.getFullYear()}.${String(appearances[0].date.getMonth() + 1).padStart(2, "0")}.${String(appearances[0].date.getDate()).padStart(2, "0")}`
    : "-";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] fade-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="relative px-5 pt-6 pb-5 border-b border-[var(--border)]"
          style={{ background: "linear-gradient(180deg, var(--muted) 0%, transparent 100%)" }}
        >
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 text-[var(--ink)] flex items-center justify-center text-[14px]"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center bg-[var(--card)] border border-[var(--border)] overflow-hidden">
              {kind === "place" ? (
                <VenueIcon kind={detectVenue(entry.type, entry.name)} size={56} />
              ) : (
                <Sparkles size={32} strokeWidth={1.6} className="text-[var(--accent)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
                {kind === "place" ? "PLACE · 地点" : "ACTIVITY · 活动"}
              </div>
              <div className="cn-serif text-[18px] text-[var(--ink)] truncate">{entry.name}</div>
              <div className="cn-serif text-[11px] text-[var(--ink-soft)] truncate">
                {entry.type}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <MiniStat n={entry.visits} label="访问" />
            <MiniStat n={entry.level} label="完善" />
            <MiniStat n={photos.length} label="照片" />
            <MiniStat n={lastStr} label="最近" small />
          </div>

          {entry.emotions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {entry.emotions.map((e) => (
                <span
                  key={e}
                  className="text-[10px] cn-serif px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--ink-soft)]"
                >
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Photo strip */}
        {photos.length > 0 && (
          <div className="px-5 pt-4">
            <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
              照片记录 · {photos.length}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 snap-x">
              {photos.map((a, i) => (
                <img
                  key={`${a.chapterId}-${a.scene.order}-${i}`}
                  src={a.rec!.photo!}
                  alt=""
                  className="h-28 w-28 object-cover rounded-xl border border-[var(--border)] shrink-0 snap-start"
                />
              ))}
            </div>
          </div>
        )}

        {/* Appearances timeline */}
        <div className="px-5 pt-5 pb-6">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-3">
            来源记录 · 出现的路线 ({appearances.length})
          </div>
          <ol className="space-y-5">
            {appearances.map((a, i) => {
              const dateStr = `${a.date.getFullYear()}.${String(a.date.getMonth() + 1).padStart(2, "0")}.${String(a.date.getDate()).padStart(2, "0")}`;
              const timeStr = `${String(a.date.getHours()).padStart(2, "0")}:${String(a.date.getMinutes()).padStart(2, "0")}`;
              return (
                <li
                  key={`${a.chapterId}-${a.scene.order}-${i}`}
                  className={`relative pl-7 border-l-2 ${a.enhanced ? "border-[var(--accent)]" : "border-[var(--border)]"}`}
                >
                  <span
                    className="absolute -left-[10px] top-0.5 w-[18px] h-[18px] rounded-full bg-[var(--card)] border-2 border-[var(--accent)] flex items-center justify-center text-[10px] text-[var(--accent)]"
                    style={{ opacity: a.enhanced ? 1 : 0.45 }}
                  >
                    {a.enhanced ? "✦" : "·"}
                  </span>

                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-[var(--border)]"
                      style={
                        imageForCard(a.card, a.rec?.photo)
                          ? undefined
                          : {
                              background: `linear-gradient(135deg, ${a.card.colors[0]}, ${a.card.colors[1]})`,
                            }
                      }
                    >
                      {imageForCard(a.card, a.rec?.photo) && (
                        <img src={imageForCard(a.card, a.rec?.photo)} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="display italic text-[10px] text-[var(--ink-soft)]">
                        CH.{String(a.chapterNo).padStart(2, "0")} · {dateStr} {timeStr}{" "}
                        {a.city && `· ${a.city}`}
                      </div>
                      <div className="cn-serif text-[13px] text-[var(--ink)] truncate">
                        「{a.card.identity}」
                      </div>
                    </div>
                    {a.rec?.mood && <span className="text-[16px] shrink-0">{a.rec.mood}</span>}
                  </div>

                  <div className="cn-serif text-[13px] text-[var(--ink)]">
                    § {a.scene.order} {a.scene.scene_name}
                  </div>
                  {kind === "place" && (
                    <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-0.5">
                      → {a.scene.action_task}
                    </div>
                  )}
                  {kind === "activity" && (
                    <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-0.5">
                      @ {a.scene.location_name}
                    </div>
                  )}

                  {a.rec?.photo && (
                    <img
                      src={a.rec.photo}
                      alt=""
                      className="mt-2 rounded-xl border border-[var(--border)] max-h-52 object-cover"
                    />
                  )}
                  {a.rec?.note && (
                    <blockquote className="mt-2 cn-serif text-[13px] text-[var(--ink)] italic border-l-2 border-[var(--accent)]/50 pl-3">
                      "{a.rec.note}"
                    </blockquote>
                  )}
                  {a.enhanced && (
                    <div className="mt-1 display text-[10px] tracking-[0.2em] text-[var(--accent)]">
                      +1 ENHANCE
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)] sticky bottom-0 bg-[var(--card)]/95 backdrop-blur flex justify-end">
          <button onClick={onClose} className="btn-soft">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ Export: 离屏渲染 + PDF 生成 ============ */
function ExportRunner({ job, onDone }: { job: ExportJob; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 等 DOM + 图片
        await new Promise((r) => setTimeout(r, 200));
        const el = ref.current;
        if (!el) {
          onDone();
          return;
        }
        const blob = await elementToPdfBlob(el);
        if (cancelled) return;
        const filename =
          job.kind === "chapter"
            ? `今日人设_CH${String(job.chapterNo).padStart(2, "0")}_${job.ch.card.identity}.pdf`
            : `今日人设_连载全集.pdf`;
        const title =
          job.kind === "chapter"
            ? `今日人设 · CH.${String(job.chapterNo).padStart(2, "0")}`
            : `今日人设 · 连载全集`;
        if (job.mode === "share") {
          const result = await shareOrDownload(blob, filename, title, "我的今日人设连载");
          if (result === "downloaded") {
            alert("当前环境不支持分享，已为你下载 PDF。");
          }
        } else {
          await downloadBlob(blob, filename);
        }
      } catch (err) {
        console.error("[export]", err);
        alert("导出失败：" + (err as Error).message);
      } finally {
        if (!cancelled) onDone();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: 760,
        background: "#fdfaf6",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <div
        ref={ref}
        style={{
          padding: "48px 44px",
          color: "#6f5850",
          fontFamily: "var(--font-cn-serif), serif",
        }}
      >
        {job.kind === "chapter" ? (
          <PrintableChapter ch={job.ch} chapterNo={job.chapterNo} />
        ) : (
          <PrintableSeries chapters={job.chapters} />
        )}
      </div>
    </div>
  );
}

function PrintableSeries({ chapters }: { chapters: ArchivedChapter[] }) {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.4em",
            color: "#8a7a6a",
          }}
        >
          TODAYPERSONA · MY SERIAL TALE
        </div>
        <h1 style={{ fontSize: 36, margin: "12px 0 6px", color: "#6f5850" }}>我的连载</h1>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 13,
            color: "#8a7a6a",
          }}
        >
          A Serial Tale of Selves · 共 {chapters.length} 章
        </div>
        <div style={{ marginTop: 18, fontSize: 12, color: "#8a7a6a" }}>
          导出于 {new Date().toLocaleString("zh-CN")}
        </div>
      </div>
      {chapters.map((ch, idx) => (
        <div key={ch.chapterId} style={{ marginBottom: 56, pageBreakAfter: "always" }}>
          <PrintableChapter ch={ch} chapterNo={chapters.length - idx} />
        </div>
      ))}
    </div>
  );
}

function PrintableChapter({ ch, chapterNo }: { ch: ArchivedChapter; chapterNo: number }) {
  const date = new Date(ch.createdAt);
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  const total = ch.journey.scenes.length;
  const done = ch.completedSceneOrders.length;
  const enhanced = Object.values(ch.sceneRecords ?? {}).filter((r) => r.note || r.photo).length;

  return (
    <article style={{ lineHeight: 1.85 }}>
      {/* Cover */}
      <div
        style={{
          height: 200,
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
          background: `linear-gradient(135deg, ${ch.card.colors[0]}, ${ch.card.colors[1]})`,
          marginBottom: 20,
        }}
      >
        {ch.card.cover && (
          <img
            src={ch.card.cover}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            crossOrigin="anonymous"
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent 60%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 16,
            right: 16,
            display: "flex",
            justifyContent: "space-between",
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.25em",
          }}
        >
          <span>✦ {ch.card.rarity}</span>
          <span>CH.{String(chapterNo).padStart(2, "0")}</span>
        </div>
        <div style={{ position: "absolute", bottom: 16, left: 18, right: 18, color: "#fff" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 12,
              opacity: 0.85,
            }}
          >
            {dateStr} {ch.city && `· ${ch.city}`}
          </div>
          <div style={{ fontSize: 20, marginTop: 4 }}>「{ch.card.identity}」</div>
          <div style={{ fontSize: 13, fontStyle: "italic", opacity: 0.9, marginTop: 2 }}>
            {ch.card.mood}
          </div>
        </div>
      </div>

      {/* Stats line */}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 12,
          color: "#8a7a6a",
          marginBottom: 18,
          fontFamily: "var(--font-display)",
          letterSpacing: "0.18em",
        }}
      >
        <span>
          SCENES {done}/{total}
        </span>
        <span>ENHANCE {enhanced}</span>
        <span>
          {ch.journey.emotion_arc.start} → {ch.journey.emotion_arc.end}
        </span>
      </div>

      {/* Opening */}
      <SectionLabel>序章 · OPENING</SectionLabel>
      <p style={{ fontSize: 14, marginTop: 6 }}>{ch.journey.story_opening}</p>

      {/* Scenes */}
      <SectionLabel style={{ marginTop: 22 }}>TIMELINE · 逐场景</SectionLabel>
      <ol style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
        {ch.journey.scenes.map((s) => {
          const rec = ch.sceneRecords?.[s.order];
          const isDone = ch.completedSceneOrders.includes(s.order);
          const t = rec?.completedAt ? new Date(rec.completedAt) : null;
          const timeStr = t
            ? `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`
            : "未点亮";
          return (
            <li
              key={s.order}
              style={{
                borderLeft: `2px solid ${isDone ? "#c89a5a" : "#e5dccf"}`,
                paddingLeft: 16,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 14 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: 11,
                      color: "#8a7a6a",
                      marginRight: 6,
                    }}
                  >
                    § {s.order}
                  </span>
                  {s.scene_name} {rec?.mood && <span style={{ marginLeft: 4 }}>{rec.mood}</span>}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#8a7a6a",
                  }}
                >
                  {timeStr}
                </span>
              </div>
              <p style={{ fontSize: 13, margin: "4px 0" }}>{s.persona_narrative}</p>
              <div style={{ fontSize: 11, color: "#8a7a6a" }}>
                @ {s.location_name} · {s.action_task}
              </div>
              {rec?.photo && (
                <img
                  src={rec.photo}
                  alt=""
                  style={{
                    marginTop: 8,
                    maxWidth: "100%",
                    maxHeight: 240,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #e5dccf",
                  }}
                  crossOrigin="anonymous"
                />
              )}
              {rec?.note && (
                <blockquote
                  style={{
                    margin: "8px 0 0",
                    paddingLeft: 12,
                    borderLeft: "2px solid rgba(200,154,90,0.5)",
                    fontStyle: "italic",
                    fontSize: 13,
                  }}
                >
                  "{rec.note}"
                </blockquote>
              )}
            </li>
          );
        })}
      </ol>

      {/* Closing */}
      <SectionLabel style={{ marginTop: 22 }}>终章 · CLOSING</SectionLabel>
      <p style={{ fontSize: 14, marginTop: 6 }}>{ch.journey.closing}</p>
    </article>
  );
}

function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 10,
        letterSpacing: "0.3em",
        color: "#8a7a6a",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
