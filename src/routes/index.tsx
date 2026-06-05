import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { PERSONA_CARDS, drawCard, RARITY_LABEL, preloadAllCovers } from "@/lib/cards";
import { savePendingCard, startRun } from "@/lib/persona-store";
import type { Journey, PersonaCard } from "@/lib/persona-types";
import { AgentChatView } from "@/components/AgentChatView";
import { getUserPhoto, subscribeUserPhoto } from "@/lib/user-photo";
import { locationErrorMessage, resolveCurrentLocation, type AutoLocationResult } from "@/lib/location";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({ component: Index });

type Mode = "agentic" | "agent" | "spread" | "tarot";

function Index() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("agentic");
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
      left: seededRange(i + 1, 0, 100).toFixed(4),
      dx: seededRange(i + 21, -100, 100).toFixed(4),
      delay: seededRange(i + 41, 0, 6).toFixed(4),
      duration: seededRange(i + 61, 6, 10).toFixed(4),
      size: seededRange(i + 81, 8, 18).toFixed(4),
    })),
    [],
  );

  function handleAccept(card: PersonaCard) {
    savePendingCard(card);
    navigate({ to: "/card" });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden px-5 pt-10 pb-20 max-w-6xl mx-auto">
      {/* 背景花瓣 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {petals.map((p) => (
          <span
            key={p.i}
            className="petal"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
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
            今天怎么玩？
          </div>
          <button
            onClick={() => navigate({ to: "/me" })}
            className="display text-[10px] tracking-[0.3em] text-[var(--ink)] opacity-70 hover:opacity-100 border border-[var(--border)] rounded-full px-3 py-1"
          >
            我的连载 ❦
          </button>
        </div>
        <h1 className="display text-5xl md:text-6xl text-[var(--ink)] leading-[1.05]">
          {mode === "agentic" ? (
            <>出行<span className="italic">Agent</span></>
          ) : (
            <>今日<span className="italic">人设</span></>
          )}
        </h1>
        <p className="cn-serif mt-4 text-[15px] text-[var(--ink-soft)]">
          {mode === "agentic" ? "先判断现实约束，再安排一条能马上走的路线" : "选一张卡，活进今天的故事里"}
        </p>
      </header>


      {/* Mode switch */}
      <div className="relative z-10 mb-8">
        <div className="grid gap-3 md:grid-cols-2">
          <button
            onClick={() => setMode("agentic")}
            className={`rounded-2xl border p-5 text-left transition ${
              mode === "agentic"
                ? "border-[var(--ink)] bg-[var(--card)] text-[var(--ink)]"
                : "border-[var(--border)] bg-[var(--muted)]/42 text-[var(--ink)] hover:border-[var(--ink-soft)]"
            }`}
          >
            <div className="display text-[10px] tracking-[0.22em] text-[var(--ink-soft)]">A. 我有想法，帮我安排</div>
            <div className="cn-serif mt-2 text-[20px] leading-snug">Agent 规划</div>
            <div className="cn-serif mt-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">
              输入真实需求，生成路线，并为这条路线生成专属人设卡
            </div>
            <div className="display mt-3 text-[10px] tracking-[0.22em] text-[var(--ink-soft)]">
              先有现实，后生成人设
            </div>
          </button>
          <button
            onClick={() => setMode(mode === "agentic" ? "agent" : mode)}
            className={`rounded-2xl border p-5 text-left transition ${
              mode !== "agentic"
                ? "border-[var(--ink)] bg-[var(--card)] text-[var(--ink)]"
                : "border-[var(--border)] bg-[var(--muted)]/42 text-[var(--ink)] hover:border-[var(--ink-soft)]"
            }`}
          >
            <div className="display text-[10px] tracking-[0.22em] text-[var(--ink-soft)]">B. 我没想法，给我灵感</div>
            <div className="cn-serif mt-2 text-[20px] leading-snug">从人设开始</div>
            <div className="cn-serif mt-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">
              AI 帮我挑、我自己选、让命运决定，选择已有卡后生成路线
            </div>
            <div className="display mt-3 text-[10px] tracking-[0.22em] text-[var(--ink-soft)]">
              先有人设，再生成路线
            </div>
          </button>
        </div>
        {mode !== "agentic" && (
          <div className="mt-4 flex justify-center">
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
        )}
      </div>

      {mode === "agentic" ? (
        <WeekendAgentFlow
          onStart={(journey, city, card) => {
            startRun(card, journey, city);
            navigate({ to: "/journey" });
          }}
        />
      ) : mode === "agent" ? (
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

type AgentStatus = "idle" | "running" | "done";

type AgentIntent = {
  city: string;
  people: string;
  start: string;
  end: string;
  anchorMeal: string;
  indoor: boolean;
  preference: string;
  anchorArea?: string;
};

type AgentLog = {
  id: string;
  label: string;
  detail: string;
  status: "done" | "running";
};

type AgentRouteNode = {
  id: string;
  time: string;
  title: string;
  venue: string;
  type: string;
  duration: string;
  distance: string;
  move: string;
  reason: string;
  locked?: boolean;
  lat?: number;
  lng?: number;
};

type AgentRoutePlan = {
  title: string;
  summary: string;
  intent: AgentIntent;
  nodes: AgentRouteNode[];
  persona: PersonaCard;
};

type ServerTripPersona = {
  identity: string;
  mood: string;
  mission: string;
  story?: string;
  keywords?: string[];
};

type ServerTripPlan = {
  title: string;
  summary: string;
  city: string;
  people: string;
  start: string;
  end: string;
  anchorMeal: string;
  indoor: boolean;
  anchorArea?: string;
  nodes: AgentRouteNode[];
  persona: ServerTripPersona;
  trace?: string[];
};

type AgentLocationContext = Pick<AutoLocationResult, "lat" | "lng" | "city" | "name"> | null;

const AGENT_EXAMPLE = "我在北京，周末准备和一个朋友出去玩一天，大约从中午12点到晚上9点，中午想吃一顿作作烧肉，其他时间你帮我安排下，希望在室内完成。";

function seededUnit(seed: number) {
  const value = Math.sin(seed * 999) * 10000;
  return value - Math.floor(value);
}

function seededRange(seed: number, min: number, max: number) {
  return min + seededUnit(seed) * (max - min);
}

function buildRoutePersonaCover(identity: string, intent: AgentIntent, colors: string[]): string {
  const title = identity.slice(0, 18);
  const sub = `${intent.city} · ${intent.start}-${intent.end}`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${colors[0]}"/>
          <stop offset="58%" stop-color="${colors[1]}"/>
          <stop offset="100%" stop-color="${colors[2]}"/>
        </linearGradient>
      </defs>
      <rect width="900" height="1200" fill="url(#bg)"/>
      <circle cx="160" cy="180" r="90" fill="rgba(255,255,255,0.35)"/>
      <circle cx="760" cy="980" r="150" fill="rgba(255,255,255,0.28)"/>
      <path d="M150 780 C310 650 500 900 750 700" fill="none" stroke="rgba(61,53,48,0.42)" stroke-width="18" stroke-linecap="round"/>
      <path d="M150 780 C310 650 500 900 750 700" fill="none" stroke="rgba(255,255,255,0.62)" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 22"/>
      ${[190, 390, 585, 735].map((x, index) => `<circle cx="${x}" cy="${index % 2 ? 735 : 780}" r="34" fill="rgba(61,53,48,0.82)"/><text x="${x}" y="${index % 2 ? 744 : 789}" text-anchor="middle" font-size="28" fill="#fffaf2" font-family="serif">${index + 1}</text>`).join("")}
      <text x="92" y="120" font-size="24" letter-spacing="9" fill="rgba(61,53,48,0.62)" font-family="serif">ROUTE PERSONA</text>
      <text x="92" y="1010" font-size="54" fill="#3d3530" font-family="serif">${title}</text>
      <text x="92" y="1072" font-size="30" fill="rgba(61,53,48,0.72)" font-family="serif">${sub}</text>
      <text x="92" y="1128" font-size="24" fill="rgba(61,53,48,0.62)" font-family="serif">由真实路线生成</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function serverPlanToRoutePlan(serverPlan: ServerTripPlan): AgentRoutePlan {
  const intent: AgentIntent = {
    city: serverPlan.city,
    people: serverPlan.people,
    start: serverPlan.start,
    end: serverPlan.end,
    anchorMeal: serverPlan.anchorMeal || "路线锚点",
    indoor: serverPlan.indoor,
    preference: serverPlan.indoor ? "室内优先，减少室外暴露和跨区折返" : "顺路优先，可按现场情况调整",
    anchorArea: serverPlan.anchorArea || undefined,
  };
  const colors = ["#e8f0d8", "#fff4ec", "#d9b98f"];
  const persona: PersonaCard = {
    id: `agent_card_${Date.now()}`,
    rarity: "SR",
    identity: serverPlan.persona.identity,
    mood: serverPlan.persona.mood,
    mission: serverPlan.persona.mission,
    colors,
    cover: buildRoutePersonaCover(serverPlan.persona.identity, intent, colors),
    illustration_keyword: `${serverPlan.city} ${serverPlan.anchorMeal} trip agent route`,
    catchphrase: "不是抽出来的，是这条路线长出来的。",
    story: serverPlan.persona.story,
    routes: serverPlan.nodes.map((node) => `${node.time} ${node.venue}`),
    best_time: `${serverPlan.start}-${serverPlan.end}`,
    companion: serverPlan.people,
    avoid: serverPlan.indoor ? "长时间户外暴晒和无意义折返" : "无目的折返",
    keywords: serverPlan.persona.keywords ?? [serverPlan.city, serverPlan.anchorMeal, serverPlan.indoor ? "室内" : "顺路"].filter(Boolean),
  };
  return {
    title: serverPlan.title,
    summary: serverPlan.summary,
    intent,
    nodes: serverPlan.nodes.map((node, index) => ({
      ...node,
      id: node.id || `node_${index + 1}`,
      locked: Boolean(node.locked),
    })),
    persona,
  };
}

function createMockTripPlan(source: string, revision = "", previousPlan: AgentRoutePlan | null = null): ServerTripPlan {
  const mergedText = `${source} ${revision}`.trim();
  const city = /上海/.test(mergedText) ? "上海" : /广州/.test(mergedText) ? "广州" : /深圳/.test(mergedText) ? "深圳" : "北京";
  const wantsKtv = /唱歌|KTV|ktv/.test(mergedText);
  const wantsXidan = /西单/.test(mergedText);
  const wantsHotpot = /火锅/.test(mergedText);
  const anchorArea = wantsXidan ? "西单大悦城" : previousPlan?.intent.anchorArea || "朝阳大悦城";
  const anchorMeal = wantsHotpot ? "室内火锅" : previousPlan?.intent.anchorMeal || "作作烧肉";
  const activityNode: AgentRouteNode = wantsKtv
    ? {
      id: "ktv",
      time: "16:40",
      title: "把聊天唱出来",
      venue: `${anchorArea}附近量贩 KTV`,
      type: "KTV",
      duration: "90min",
      distance: "同商圈步行约 8-12 分钟",
      move: "步行或商场内换乘",
      reason: "模拟改线：保留室内和朋友同行，把轻娱乐节点换成唱歌。",
    }
    : {
      id: "arcade",
      time: "16:30",
      title: "轻量娱乐缓冲",
      venue: `${anchorArea}电玩城`,
      type: "室内娱乐",
      duration: "75min",
      distance: "同商圈步行约 6-10 分钟",
      move: "步行",
      reason: "饭后安排一个不需要太多准备的室内活动，方便临场调整。",
    };

  return {
    title: `${city}${anchorArea}室内一日路线`,
    summary: revision
      ? `本地模拟 Agent 已根据“${revision}”重排路线，真实部署后会由 Supabase Function 调 LLM 和高德 POI 生成。`
      : "本地模拟 Agent 已生成一条可调试路线，用来验证前端 trace、路线卡、改线和开始路线流程。",
    city,
    people: /朋友/.test(mergedText) ? "和一个朋友" : "同行信息未明确",
    start: "12:00",
    end: "21:00",
    anchorMeal,
    indoor: true,
    anchorArea,
    nodes: [
      {
        id: "lunch",
        time: "12:00",
        title: "先锁定午餐锚点",
        venue: `${anchorArea}${anchorMeal}`,
        type: wantsHotpot ? "火锅" : "烤肉",
        duration: "90min",
        distance: "路线起点",
        move: "到店集合",
        reason: "用户明确提出中午想吃的内容，先把午餐作为全路线锚点。",
        locked: true,
        lat: city === "北京" ? 39.909 : undefined,
        lng: city === "北京" ? 116.374 : undefined,
      },
      {
        id: "mall",
        time: "14:00",
        title: "饭后室内缓冲",
        venue: `${anchorArea}商场中庭`,
        type: "商场",
        duration: "60min",
        distance: "同楼或步行约 5 分钟",
        move: "步行",
        reason: "饭后留出缓冲，减少跨区移动，适合聊天和消化。",
      },
      activityNode,
      {
        id: "dinner",
        time: "19:00",
        title: "晚间收尾",
        venue: `${anchorArea}附近简餐/甜品`,
        type: "餐饮",
        duration: "75min",
        distance: "待导航确认",
        move: "步行或打车 10 分钟内",
        reason: "最后用轻餐饮收尾，避免路线越走越散。",
      },
    ],
    persona: {
      identity: "把今天安排成可执行路线的人",
      mood: "想出门，但不想被复杂路线消耗",
      mission: "把午餐、室内活动和晚间收尾串成一条能马上走的路线",
      story: "这张模拟人设卡来自本地调试数据。真实后端接通后，它会由模型根据真实需求和 POI 重新生成。",
      keywords: [city, anchorArea, anchorMeal, wantsKtv ? "唱歌" : "室内娱乐"],
    },
    trace: [
      "本地模拟：已读取自然语言需求。",
      `本地模拟：识别城市为 ${city}，路线锚点为 ${anchorArea}${anchorMeal}。`,
      wantsKtv ? "本地模拟：检测到改线偏好，已把娱乐节点替换为 KTV。" : "本地模拟：生成室内优先的饭后活动节点。",
      "本地模拟：路线卡和人设卡已生成，可继续测试删除、改线和开始路线。",
    ],
  };
}

function narrativeForAgentNode(node: AgentRouteNode, persona: PersonaCard): string {
  if (node.id === "lunch") {
    return `第一站先把午餐定下来。${node.venue} 是这条路线的锚点，后面的安排都围绕它少折返地展开。`;
  }
  if (node.id === "mall") {
    return `饭后不急着切换到下一个项目，先留一段室内缓冲。这里适合聊天、消化，也给后面的活动留出余量。`;
  }
  if (node.id === "ktv") {
    return `既然你明确想唱歌，这一站就不再保留电玩城。KTV 接住朋友同行的社交感，也不破坏全程室内的约束。`;
  }
  if (node.id === "arcade") {
    return `这一站是轻娱乐，不是必须完成的任务。如果临场觉得不合适，可以直接换成唱歌、电影或桌游。`;
  }
  if (node.id === "dinner") {
    return `最后用一个室内餐饮点收尾，避免路线越走越散。到这里，${persona.identity} 的今天已经有了开始、停留和结束。`;
  }
  return node.reason;
}

function closingForAgentPlan(plan: AgentRoutePlan): string {
  const doneText = plan.nodes
    .map((node, index) => `${index + 1}. ${node.time} ${node.venue}`)
    .join("；");
  return `今日路线复盘：${doneText}。这条路线从“${plan.intent.anchorMeal}”这个现实锚点出发，围绕${plan.intent.anchorArea ?? "同一商圈"}把午餐、饭后缓冲、室内活动和晚间收尾串了起来。`;
}

function routePlanToJourney(plan: AgentRoutePlan): Journey {
  return {
    story_opening: `Agent 已生成 ${plan.intent.city} ${plan.intent.start}-${plan.intent.end} 的路线，并把它写成「${plan.persona.identity}」这张今日专属人设卡。午餐锚点已锁定，其余节点可继续通过对话替换。`,
    emotion_arc: { start: "现实需求", end: plan.persona.identity },
    scenes: plan.nodes.map((node, index) => ({
      order: index + 1,
      scene_name: node.title,
      location_name: node.venue,
      location_type: node.type,
      location_hint: `${node.time} · ${node.move} · ${node.distance}`,
      persona_narrative: narrativeForAgentNode(node, plan.persona),
      action_task: `${node.duration}。${node.reason}`,
      stay_minutes: Number(node.duration.replace(/\D/g, "")) || 60,
      emotion_tags: [plan.intent.indoor ? "室内" : "顺路", node.locked ? "已锁定" : "可替换"],
      meituan_keyword: node.venue,
      lat: node.lat,
      lng: node.lng,
    })),
    closing: closingForAgentPlan(plan),
  };
}

function WeekendAgentFlow({ onStart }: { onStart: (journey: Journey, city: string, card: PersonaCard) => void }) {
  const [request, setRequest] = useState("");
  const [locatedCity, setLocatedCity] = useState("");
  const [location, setLocation] = useState<AgentLocationContext>(null);
  const [locationError, setLocationError] = useState("");
  const [locationState, setLocationState] = useState<"idle" | "asking" | "granted">("idle");
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [plan, setPlan] = useState<AgentRoutePlan | null>(null);
  const [revision, setRevision] = useState("");

  async function askLocation() {
    setLocationState("asking");
    setLocationError("");
    try {
      const nextLocation = await resolveCurrentLocation();
      setLocation(nextLocation);
      setLocatedCity(nextLocation.city || "北京");
      setLocationState("granted");
    } catch (error) {
      setLocationError(locationErrorMessage(error));
      setLocationState("idle");
    }
  }

  async function runAgent(nextText = request, nextRevision = "") {
    const source = nextText.trim();
    if (!source && !nextRevision.trim()) {
      setPlan(null);
      setStatus("idle");
      setLogs([{
        id: "need-input",
        label: "需要真实需求",
        detail: "先输入你这次出行的个人情况、时间、城市或想做的事，Agent 才会开始规划。",
        status: "done",
      }]);
      return;
    }
    setStatus("running");
    setPlan((current) => current);
    setLogs([{
      id: "agent-start",
      label: nextRevision.trim() ? "发送改线要求" : "发送出行需求",
      detail: nextRevision.trim() || source,
      status: "running",
    }]);
    try {
      const { data, error } = await supabase.functions.invoke("generate-trip-agent", {
        body: {
          request: source,
          revision: nextRevision.trim(),
          city: locatedCity || location?.city || "",
          lat: location?.lat,
          lng: location?.lng,
          previous_plan: plan ? {
            title: plan.title,
            summary: plan.summary,
            city: plan.intent.city,
            people: plan.intent.people,
            start: plan.intent.start,
            end: plan.intent.end,
            anchorMeal: plan.intent.anchorMeal,
            anchorArea: plan.intent.anchorArea,
            indoor: plan.intent.indoor,
            nodes: plan.nodes,
          } : null,
        },
      });
      if (error) throw error;
      const response = data as { plan?: ServerTripPlan; logs?: string[]; error?: string };
      if (!response.plan) throw new Error(response.error || "Agent 没有返回路线");
      const nextPlan = serverPlanToRoutePlan(response.plan);
      const nextLogs: AgentLog[] = (response.logs?.length ? response.logs : response.plan.trace ?? []).map((detail, index) => ({
        id: `trace_${index}`,
        label: index === 0 ? "识别需求" : index === (response.logs?.length ?? response.plan?.trace?.length ?? 1) - 1 ? "完成路线" : "Agent 执行中",
        detail,
        status: "done",
      }));
      setLogs(nextLogs.length ? nextLogs : [{
        id: "done",
        label: "路线生成完成",
        detail: response.plan.summary,
        status: "done",
      }]);
      setPlan(nextPlan);
      setLocatedCity(nextPlan.intent.city || locatedCity);
      setStatus("done");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLogs((current) => [
        ...current.map((log) => ({ ...log, status: "done" as const })),
        {
          id: "agent-error",
          label: "Agent 没有完成规划",
          detail: message.includes("need_location")
            ? "缺少城市或定位。请先授权定位，或在输入里明确城市。"
            : message.includes("need_more_detail")
              ? "需求里缺少可搜索的餐饮或活动线索，请补充一个想吃/想做/想避开的内容。"
              : `后端规划失败：${message}`,
          status: "done",
        },
      ]);
      setStatus("idle");
    }
  }

  async function runMockAgent(nextText = request || AGENT_EXAMPLE, nextRevision = "") {
    const source = nextText.trim() || AGENT_EXAMPLE;
    if (!request.trim()) setRequest(source);
    setStatus("running");
    setLogs([{
      id: "mock-start",
      label: nextRevision.trim() ? "本地模拟改线" : "本地模拟 Agent",
      detail: nextRevision.trim() || source,
      status: "running",
    }]);
    await new Promise((resolve) => setTimeout(resolve, 420));
    const mockPlan = createMockTripPlan(source, nextRevision.trim(), plan);
    const nextPlan = serverPlanToRoutePlan(mockPlan);
    setLogs((mockPlan.trace ?? []).map((detail, index) => ({
      id: `mock_trace_${index}`,
      label: index === 0 ? "识别需求" : index === (mockPlan.trace?.length ?? 1) - 1 ? "完成路线" : "Agent 执行中",
      detail,
      status: "done",
    })));
    setPlan(nextPlan);
    setLocatedCity(nextPlan.intent.city || locatedCity);
    setStatus("done");
  }

  function deleteNode(id: string) {
    setPlan((current) => current ? { ...current, nodes: current.nodes.filter((node) => node.id !== id || node.locked) } : current);
  }

  function applyRevision() {
    if (!plan || !revision.trim()) return;
    runAgent(request, revision);
    setRevision("");
  }

  function applyMockRevision() {
    if (!plan || !revision.trim()) return;
    runMockAgent(request, revision);
    setRevision("");
  }

  return (
    <section className="relative z-10 max-w-5xl mx-auto">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 shadow-[0_18px_48px_-34px_rgba(60,40,30,0.32)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="display text-[10px] tracking-[0.32em] text-[var(--ink-soft)]">TRIP AGENT</div>
            <h2 className="cn-serif mt-2 text-[26px] leading-snug text-[var(--ink)]">直接告诉它你想怎么出门。</h2>
            <p className="cn-serif mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--ink-soft)]">
              Agent 会抽取意图、查找锚点、计算移动距离、生成路线卡。你可以继续用一句话删节点、换节点、重排。
            </p>
          </div>
          <button onClick={askLocation} className="btn-ghost shrink-0">
            {locationState === "idle" ? "授权定位" : locationState === "asking" ? "定位中..." : `已定位：${location?.name || locatedCity}`}
          </button>
        </div>
        {locationError && (
          <div className="mt-3 rounded-2xl bg-[oklch(0.95_0.05_25)] px-4 py-3 cn-serif text-[13px] text-[oklch(0.4_0.15_25)]">
            {locationError}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
          <textarea
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            rows={5}
            className="w-full resize-none bg-transparent px-2 py-2 cn-serif text-[15px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[oklch(0.45_0.02_50)]"
            placeholder={AGENT_EXAMPLE}
          />
          <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={() => setRequest(AGENT_EXAMPLE)} className="btn-ghost">
              填入示例
            </button>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {import.meta.env.DEV && (
                <button onClick={() => runMockAgent()} disabled={status === "running"} className="btn-ghost">
                  本地模拟 Agent
                </button>
              )}
              <button onClick={() => runAgent()} disabled={status === "running"} className="btn-soft">
                {status === "running" ? "Agent 执行中..." : "发送给 Agent"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--muted)]/55 p-5">
          <div className="display text-[10px] tracking-[0.32em] text-[var(--ink-soft)]">AGENT TRACE</div>
          <div className="mt-4 space-y-3">
            {logs.length === 0 ? (
              <div className="cn-serif rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-4 text-[14px] leading-relaxed text-[var(--ink-soft)]">
                等待自然语言需求。发送后这里会展示 Agent 正在识别、查找、筛选和重排的过程。
              </div>
            ) : logs.map((log) => (
              <div key={log.id} className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${log.status === "running" ? "animate-pulse bg-[var(--accent)]" : "bg-[var(--ink)]"}`} />
                <div>
                  <div className="cn-serif text-[14px] text-[var(--ink)]">{log.label}</div>
                  <div className="cn-serif mt-1 text-[12.5px] leading-relaxed text-[var(--ink-soft)]">{log.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="display text-[10px] tracking-[0.32em] text-[var(--ink-soft)]">ROUTE CARD</div>
          {!plan ? (
            <div className="mt-4 rounded-2xl bg-[var(--muted)] p-5 cn-serif text-[14px] leading-relaxed text-[var(--ink-soft)]">
              路线生成后会出现在这里：每个节点都能删除，Agent 也会为这条路线生成一张专属人设卡，作为后续 Journey 和报告的 storyline。
            </div>
          ) : (
            <>
              <h3 className="cn-serif mt-2 text-[22px] leading-snug text-[var(--ink)]">{plan.title}</h3>
              <p className="cn-serif mt-2 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">{plan.summary}</p>
              <div className="mt-4 space-y-3">
                {plan.nodes.map((node, index) => (
                  <div key={node.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--card)] display text-[11px]">{index + 1}</div>
                        <div>
                          <div className="cn-serif text-[15px] text-[var(--ink)]">{node.time} · {node.title}</div>
                          <div className="cn-serif mt-0.5 text-[13px] leading-relaxed text-[var(--ink-soft)]">{node.venue} · {node.type} · {node.duration}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteNode(node.id)}
                        disabled={node.locked}
                        className="cn-serif rounded-full border border-[var(--border)] px-3 py-1 text-[12px] text-[var(--ink-soft)] disabled:opacity-45"
                      >
                        {node.locked ? "已锁定" : "删除"}
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-[var(--card)] px-3 py-2 cn-serif text-[12.5px] text-[var(--ink)]">{node.move}</div>
                      <div className="rounded-xl bg-[var(--card)] px-3 py-2 cn-serif text-[12.5px] text-[var(--ink)]">{node.distance}</div>
                    </div>
                    <div className="cn-serif mt-3 text-[12.5px] leading-relaxed text-[var(--ink-soft)]">{node.reason}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                <input
                  value={revision}
                  onChange={(event) => setRevision(event.target.value)}
                  className="w-full bg-transparent px-2 py-2 cn-serif text-[14px] text-[var(--ink)] outline-none placeholder:text-[oklch(0.45_0.02_50)]"
                  placeholder="继续改：我想去西单大悦城的作作烧肉 / 我不想打游戏，我想唱歌"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => setRevision("我不想打游戏，我想唱歌")} className="btn-ghost">填入改线示例</button>
                  <button onClick={() => setRevision("我想去西单大悦城的作作烧肉，而不是朝阳大悦城")} className="btn-ghost">改到西单</button>
                  <button onClick={() => setRevision("我不想吃作作烧肉了，换成火锅")} className="btn-ghost">换掉午餐</button>
                  {import.meta.env.DEV && (
                    <button onClick={applyMockRevision} disabled={!revision.trim() || status === "running"} className="btn-ghost">模拟改线</button>
                  )}
                  <button onClick={applyRevision} disabled={!revision.trim() || status === "running"} className="btn-soft">让 Agent 改线</button>
                </div>
              </div>

              <button onClick={() => onStart(routePlanToJourney(plan), plan.intent.city, plan.persona)} className="btn-soft mt-4 w-full">
                开始这条路线
              </button>
            </>
          )}
        </div>
        {plan && (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 lg:col-start-2"
            style={{ background: `linear-gradient(135deg, ${plan.persona.colors[0]}, ${plan.persona.colors[1]} 58%, ${plan.persona.colors[2]})` }}>
            <div className="display text-[10px] tracking-[0.32em] text-[var(--ink-soft)]">PERSONA CARD · 路线生成后</div>
            <div className="cn-serif mt-2 text-[22px] leading-snug text-[var(--ink)]">{plan.persona.identity}</div>
            <div className="cn-serif mt-1 text-[14px] leading-relaxed text-[var(--ink)]">「{plan.persona.mission}」</div>
            <div className="cn-serif mt-3 text-[13px] leading-relaxed text-[var(--ink-soft)]">{plan.persona.story}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(plan.persona.keywords ?? []).map((keyword) => (
                <span key={keyword} className="rounded-full bg-white/55 px-2 py-0.5 cn-serif text-[11px] text-[var(--ink)]">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
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
