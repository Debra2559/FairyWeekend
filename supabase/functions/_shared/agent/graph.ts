/**
 * LangGraph Graph 构建
 * 参考设计文档 5.3 图构建 + 5.4 并行优化
 *
 * 流程：
 *   START
 *     │
 *     ├── fetch_profile (并行)
 *     └── resolve_location (并行)
 *           │
 *           ▼
 *       plan_pois (Agent 1)
 *           │
 *           ▼
 *       validate_pois
 *           │
 *           ▼
 *       generate_journey (Agent 2)
 *           │
 *           ▼
 *          END
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { QuestState } from "./state.ts";
import {
  fetchProfile,
  resolveLocation,
  planPois,
  validatePois,
  generateJourney,
} from "./nodes.ts";

// ===== 日志工具 =====

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
  const prefix = `[${timestamp}][QuestGraph]`;
  if (data !== undefined) {
    console.log(prefix, message, typeof data === "object" ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(prefix, message);
  }
}

log("🔧 构建 LangGraph...");

// ===== Graph 构建 =====

const workflow = new StateGraph(QuestState)
  // ===== 添加节点 =====
  .addNode("fetch_profile", fetchProfile)
  .addNode("resolve_location", resolveLocation)
  .addNode("plan_pois", planPois)
  .addNode("validate_pois", validatePois)
  .addNode("generate_journey", generateJourney)

  // ===== 并行入口（从 START 同时触发两个节点）=====
  .addEdge(START, "fetch_profile")
  .addEdge(START, "resolve_location")

  // ===== 汇合点（两个并行节点都完成后，进入 plan_pois）=====
  .addEdge("fetch_profile", "plan_pois")
  .addEdge("resolve_location", "plan_pois")

  // ===== 顺序流程 =====
  .addEdge("plan_pois", "validate_pois")
  .addEdge("validate_pois", "generate_journey")
  .addEdge("generate_journey", END);

// ===== 编译 Graph =====

export const questGraph = workflow.compile();

log("✅ LangGraph 构建完成");

// ===== 执行函数 =====

import type { PersonaCard, Journey } from "./state.ts";

export interface QuestInput {
  card: PersonaCard;
  city?: string;
  lat?: number;
  lng?: number;
  playerKey?: string;
  timePeriod?: string;
  companion?: string;
}

export interface QuestOutput {
  journey: Journey | undefined;
  city: string;
  poiCount: number;
  keywords: string[];
  error?: string;
}

/**
 * 执行完整的 Quest 流程
 */
export async function runQuest(input: QuestInput): Promise<QuestOutput> {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);

  console.log("\n" + "=".repeat(60));
  console.log(`[${timestamp}][Quest] 🚀 开始执行 Quest`);
  console.log("=".repeat(60));

  // 不再默认上海。要么有城市名，要么有坐标，否则直接报错
  const hasCoords = typeof input.lat === "number" && typeof input.lng === "number";
  const cityInput = (input.city || "").trim();
  if (!cityInput && !hasCoords) {
    throw new Error("缺少定位信息：请先选择城市或开启定位");
  }

  const initialState = {
    card: input.card,
    city: cityInput,
    lat: input.lat,
    lng: input.lng,
    playerKey: input.playerKey,
    timePeriod: input.timePeriod || "下午",
    companion: input.companion || "独行",

    // 初始状态
    playerProfile: undefined,
    gcjCoords: undefined,
    poiKeywords: [],
    poiCandidates: [],
    journey: undefined,
    error: undefined,
  };

  log("📋 输入参数", {
    identity: input.card.identity,
    rarity: input.card.rarity,
    city: cityInput || "(无 · 用坐标)",
    hasCoords,
    playerKey: input.playerKey || "无",
  });


  const startTime = Date.now();

  try {
    const result = await questGraph.invoke(initialState);

    const elapsed = Date.now() - startTime;

    console.log("\n" + "=".repeat(60));
    console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}][Quest] ✅ 执行完成`);
    console.log("=".repeat(60));

    log("📊 执行结果", {
      elapsed: `${elapsed}ms`,
      scenesCount: result.journey?.scenes?.length || 0,
      poiCount: result.poiCandidates?.length || 0,
      city: result.city,
    });

    return {
      journey: result.journey,
      city: result.city,
      poiCount: result.poiCandidates.length,
      keywords: result.poiKeywords,
      error: result.error,
    };
  } catch (e) {
    const elapsed = Date.now() - startTime;

    console.log("\n" + "=".repeat(60));
    console.log(`[${new Date().toISOString().split("T")[1].slice(0, 12)}][Quest] ❌ 执行失败`);
    console.log("=".repeat(60));

    log(`❌ 错误: ${e}`);
    console.error(e);

    return {
      journey: undefined,
      city: (input.city || "").trim(),
      poiCount: 0,
      keywords: [],
      error: String(e),
    };

  }
}
