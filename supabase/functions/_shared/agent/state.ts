/**
 * LangGraph State 定义
 * 参考设计文档 5.1 状态定义
 *
 * 更新：
 * - 增加结构化错误状态（errors、warnings）
 * - 增加执行状态（executionStatus）
 */

import { Annotation } from "@langchain/langgraph";
import type { POI, PlayerProfile, ToolErrorType } from "./tools/index.ts";

// ===== 类型定义 =====

/**
 * 人设卡
 */
export interface PersonaCard {
  id: string;
  rarity: "N" | "R" | "SR" | "SSR";
  identity: string;    // 身份
  mood: string;        // 今日状态
  mission: string;     // 今日使命
  colors: string[];    // 卡片配色
  illustration_keyword: string;
  cover?: string;
}

/**
 * 场景
 */
export interface JourneyScene {
  order: number;
  scene_name: string;        // 诗意命名
  location_name: string;
  location_type: string;
  location_hint: string;
  persona_narrative: string; // 人设视角叙事
  action_task: string;       // 具体行动
  stay_minutes: number;
  emotion_tags: string[];
  meituan_keyword: string;
}

/**
 * 路线
 */
export interface Journey {
  story_opening: string;
  emotion_arc: {
    start: string;
    end: string;
  };
  scenes: JourneyScene[];
  closing: string;
}

/**
 * POI 关键词输出（Agent 1 的结构化输出）
 */
export interface POIKeywordsOutput {
  keywords: string[];    // 搜索关键词列表
  reasoning: string;     // 决策理由（调试用）
}

// ===== 错误处理类型 =====

/**
 * 错误类型（扩展自工具错误类型）
 */
export type QuestErrorType = ToolErrorType | "AGENT_ERROR" | "VALIDATION_ERROR" | "CONFIG_ERROR";

/**
 * 任务错误
 */
export interface QuestError {
  node: string;                    // 发生错误的节点名
  type: QuestErrorType;            // 错误类型
  message: string;                 // 错误信息
  recoverable: boolean;            // 是否可恢复
  timestamp: number;               // 时间戳
  details?: Record<string, unknown>; // 额外详情
}

/**
 * 任务警告（非致命问题）
 */
export interface QuestWarning {
  node: string;                    // 发生警告的节点名
  message: string;                 // 警告信息
  timestamp: number;               // 时间戳
  details?: Record<string, unknown>; // 额外详情
}

/**
 * 执行状态
 */
export type ExecutionStatus =
  | "running"         // 执行中
  | "success"         // 完全成功
  | "partial_success" // 部分成功（有警告）
  | "failed";         // 失败（有不可恢复错误）

// ===== State 定义 =====

/**
 * QuestState - LangGraph 图状态
 *
 * 数据流：
 *   输入 → fetch_profile/resolve_location (并行) → plan_pois → generate_journey → 输出
 */
export const QuestState = Annotation.Root({
  // ===== 输入 =====
  /** 人设卡 */
  card: Annotation<PersonaCard>,

  /** 城市名称 */
  city: Annotation<string>,

  /** 用户纬度 (WGS84) */
  lat: Annotation<number | undefined>,

  /** 用户经度 (WGS84) */
  lng: Annotation<number | undefined>,

  /** 玩家唯一标识 */
  playerKey: Annotation<string | undefined>,

  /** 时间段：上午/下午/傍晚/晚上 */
  timePeriod: Annotation<string>,

  /** 同伴：独行/情侣/朋友/家人 */
  companion: Annotation<string>,

  // ===== 中间状态 =====
  /** 玩家画像（从 dm_memory 读取） */
  playerProfile: Annotation<PlayerProfile | undefined>,

  /** GCJ02 坐标（坐标转换后） */
  gcjCoords: Annotation<{ lng: number; lat: number } | undefined>,

  /** POI 搜索关键词（Agent 1 分析结果） */
  poiKeywords: Annotation<string[]>,

  /** 候选 POI 列表 */
  poiCandidates: Annotation<POI[]>,

  // ===== 错误状态 =====
  /** 错误日志（累积） */
  errors: Annotation<QuestError[]>({
    reducer: (x, y) => {
      // 防御性检查：y 可能是 undefined 或单个对象
      if (!y) return x;
      if (Array.isArray(y)) return [...x, ...y];
      return [...x, y];
    },
    default: () => [],
  }),

  /** 警告日志（累积） */
  warnings: Annotation<QuestWarning[]>({
    reducer: (x, y) => {
      // 防御性检查：y 可能是 undefined 或单个对象
      if (!y) return x;
      if (Array.isArray(y)) return [...x, ...y];
      return [...x, y];
    },
    default: () => [],
  }),

  /** 执行状态 */
  executionStatus: Annotation<ExecutionStatus>({
    reducer: (_, y) => y ?? "running",
    default: () => "running",
  }),

  // ===== 输出 =====
  /** 最终生成的路线 */
  journey: Annotation<Journey | undefined>,

  /** 错误信息（兼容旧版，存储第一个致命错误） */
  error: Annotation<string | undefined>,
});

// 导出 State 类型（用于 Node 函数参数）
export type QuestStateType = typeof QuestState.State;

// ===== 错误辅助函数 =====

/**
 * 创建错误对象
 */
export function createError(
  node: string,
  type: QuestErrorType,
  message: string,
  recoverable: boolean = false,
  details?: Record<string, unknown>
): QuestError {
  return {
    node,
    type,
    message,
    recoverable,
    timestamp: Date.now(),
    details,
  };
}

/**
 * 创建警告对象
 */
export function createWarning(
  node: string,
  message: string,
  details?: Record<string, unknown>
): QuestWarning {
  return {
    node,
    message,
    timestamp: Date.now(),
    details,
  };
}

/**
 * 判断是否有致命错误
 */
export function hasFatalErrors(errors: QuestError[]): boolean {
  return errors.some((e) => !e.recoverable);
}

/**
 * 获取第一个致命错误
 */
export function getFirstFatalError(errors: QuestError[]): QuestError | undefined {
  return errors.find((e) => !e.recoverable);
}

/**
 * 计算执行状态
 */
export function computeExecutionStatus(
  errors: QuestError[],
  warnings: QuestWarning[],
  hasOutput: boolean
): ExecutionStatus {
  if (hasFatalErrors(errors)) {
    return "failed";
  }
  if (errors.length > 0 || warnings.length > 0) {
    return hasOutput ? "partial_success" : "failed";
  }
  return hasOutput ? "success" : "partial_success";
}
