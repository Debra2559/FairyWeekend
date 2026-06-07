/**
 * LangGraph Nodes 实现
 * 节点编排层，调用 agents 和 tools
 *
 * 更新：
 * - 使用类型化工具函数
 * - 增强错误处理，使用结构化错误状态
 */

import {
  type QuestStateType,
  createError,
  createWarning,
} from "./state.ts";
import {
  getPlayerProfileTyped,
  reverseGeocodeTyped,
} from "./tools/index.ts";
import { runPOIPlanner } from "./agents/poi-planner.agent.ts";
import { runStoryGenerator } from "./agents/story-generator.agent.ts";

// ===== 日志工具 =====

function log(node: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
  const prefix = `[${timestamp}][${node}]`;
  if (data !== undefined) {
    console.log(prefix, message, typeof data === "object" ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(prefix, message);
  }
}

function logWarn(node: string, message: string, error?: unknown) {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
  console.warn(`[${timestamp}][${node}]`, message, error ?? "");
}

// ===== Node 1: fetchProfile =====

/**
 * 获取玩家画像
 * 并行节点，与 resolveLocation 同时执行
 */
export async function fetchProfile(state: QuestStateType) {
  const node = "fetchProfile";
  log(node, "🚀 开始执行");

  // 预期内的缺失，记录为警告
  if (!state.playerKey) {
    log(node, "⏭️ 无 playerKey，跳过");
    return {
      warnings: [createWarning(node, "无 playerKey，跳过获取玩家画像")],
    };
  }

  log(node, "📥 获取玩家画像...", { playerKey: state.playerKey });

  // 使用类型化函数
  const result = await getPlayerProfileTyped(state.playerKey);

  // 工具调用失败
  if (!result.success) {
    logWarn(node, "❌ 获取失败", result.error);
    return {
      errors: [createError(
        node,
        result.error.type,
        result.error.message,
        result.error.retryable
      )],
      playerProfile: undefined,
    };
  }

  const profile = result.data;

  // 查询有问题（如数据库错误）
  if (profile._meta.error) {
    logWarn(node, `⚠️ 查询有问题: ${profile._meta.error.message}`);
    return {
      errors: [createError(
        node,
        profile._meta.error.type as any,
        profile._meta.error.message,
        profile._meta.error.retryable
      )],
      playerProfile: undefined,
    };
  }

  // 未找到记录是预期情况，不算错误
  if (!profile._meta.found) {
    log(node, "ℹ️ 未找到玩家记录，使用默认画像");
    return {
      warnings: [createWarning(node, "未找到玩家记录，使用默认画像")],
      playerProfile: {
        profile: profile.profile,
        loved_tags: profile.loved_tags,
        disliked_tags: profile.disliked_tags,
        visited_pois: profile.visited_pois,
      },
    };
  }

  log(node, "✅ 成功获取画像", {
    found: profile._meta.found,
    profile: profile.profile?.slice(0, 50) + "...",
    loved_tags: profile.loved_tags?.slice(0, 5),
    disliked_tags: profile.disliked_tags?.slice(0, 5),
    visited_count: profile.visited_pois?.length || 0,
  });

  // 返回不带 _meta 的 profile
  return {
    playerProfile: {
      profile: profile.profile,
      loved_tags: profile.loved_tags,
      disliked_tags: profile.disliked_tags,
      visited_pois: profile.visited_pois,
    },
  };
}

// ===== Node 2: resolveLocation =====

/**
 * 坐标转换 + 逆地理编码
 * 并行节点，与 fetchProfile 同时执行
 */
export async function resolveLocation(state: QuestStateType) {
  const node = "resolveLocation";
  log(node, "🚀 开始执行");

  // 预期内的缺失，记录为警告
  if (typeof state.lat !== "number" || typeof state.lng !== "number") {
    log(node, "⏭️ 无坐标，跳过");
    return {
      warnings: [createWarning(node, "无坐标信息，跳过逆地理编码")],
    };
  }

  log(node, "📥 转换坐标...", {
    wgs84: { lng: state.lng, lat: state.lat },
  });

  // 使用类型化函数
  const result = await reverseGeocodeTyped(state.lat, state.lng);

  // 工具调用失败
  if (!result.success) {
    logWarn(node, "❌ 逆地理编码失败", result.error);
    return {
      errors: [createError(
        node,
        result.error.type,
        result.error.message,
        result.error.retryable
      )],
      gcjCoords: undefined,
    };
  }

  const geo = result.data;

  // API 返回错误
  if (!geo._meta.success || geo._meta.error) {
    logWarn(node, "❌ 解析失败", geo._meta.error);
    return {
      errors: [createError(
        node,
        geo._meta.error?.type as any || "API_ERROR",
        geo._meta.error?.message || "逆地理编码失败",
        geo._meta.error?.retryable ?? false
      )],
      gcjCoords: undefined,
    };
  }

  log(node, "✅ 成功解析位置", {
    city: geo.city,
    district: geo.district,
    label: geo.label,
    gcj: geo.gcj,
  });

  return {
    gcjCoords: geo.gcj,
    city: state.city || geo.label,
  };
}

// ===== Node 3: planPois (调用 Agent 1) =====

/**
 * 分析人设 + 搜索 POI
 * 调用 poi-planner.agent
 */
export async function planPois(state: QuestStateType) {
  const node = "planPois";
  log(node, "🚀 开始执行");

  log(node, "📋 输入参数", {
    identity: state.card.identity,
    mood: state.card.mood,
    mission: state.card.mission,
    rarity: state.card.rarity,
    city: state.city,
    hasProfile: !!state.playerProfile,
    hasCoords: !!state.gcjCoords,
  });

  const startTime = Date.now();

  try {
    const result = await runPOIPlanner({
      card: {
        identity: state.card.identity,
        mood: state.card.mood,
        mission: state.card.mission,
        rarity: state.card.rarity,
      },
      city: state.city,
      timePeriod: state.timePeriod,
      playerProfile: state.playerProfile,
      gcjCoords: state.gcjCoords,
    });

    const elapsed = Date.now() - startTime;

    // 安全检查：确保 result 有效
    const keywords = result?.keywords || [];
    const candidates = result?.candidates || [];

    log(node, "✅ Agent 执行完成", {
      elapsed: `${elapsed}ms`,
      keywordsCount: keywords.length,
      candidatesCount: candidates.length,
      keywords,
    });

    if (candidates.length > 0) {
      log(node, "📍 候选 POI 示例", candidates.slice(0, 3).map((p) => ({
        name: p.name,
        type: p.type,
        address: p.address?.slice(0, 30),
      })));
    }

    // 候选数量过少，记录警告
    const warnings = [];
    if (candidates.length < 5) {
      warnings.push(createWarning(
        node,
        `候选 POI 数量较少: ${candidates.length}`,
        { keywords, expectedMin: 5 }
      ));
    }

    // 构建返回对象，只在有警告时才包含 warnings 字段
    if (warnings.length > 0) {
      return {
        poiKeywords: keywords,
        poiCandidates: candidates,
        warnings,
      };
    }
    return {
      poiKeywords: keywords,
      poiCandidates: candidates,
    };
  } catch (e) {
    const elapsed = Date.now() - startTime;
    logWarn(node, `❌ Agent 执行失败 (${elapsed}ms)`, e);

    return {
      poiKeywords: [],
      poiCandidates: [],
      errors: [createError(
        node,
        "AGENT_ERROR",
        e instanceof Error ? e.message : String(e),
        true, // Agent 错误可能是暂时的
        { elapsed }
      )],
    };
  }
}

// ===== Node 4: validatePois =====

/**
 * 验证候选 POI
 * 简单验证，失败只记录警告，不重试
 */
export async function validatePois(state: QuestStateType) {
  const node = "validatePois";
  log(node, "🚀 开始执行");

  // 确保 poiCandidates 是数组
  const poiCandidates = state.poiCandidates || [];
  const types = new Set(poiCandidates.map((p) => p.type));

  log(node, "📊 统计信息", {
    total: poiCandidates.length,
    typesCount: types.size,
    types: Array.from(types),
  });

  const warnings: ReturnType<typeof createWarning>[] = [];

  if (poiCandidates.length < 10) {
    warnings.push(createWarning(
      node,
      `候选 POI 数量不足: ${poiCandidates.length}/10`,
      { actual: poiCandidates.length, expected: 10 }
    ));
  }

  if (types.size < 2) {
    warnings.push(createWarning(
      node,
      `地点类型单一: ${types.size}/2`,
      { actualTypes: Array.from(types), expectedMin: 2 }
    ));
  }

  // 候选数量过少但大于0，可以继续
  if (poiCandidates.length === 0) {
    logWarn(node, "❌ 无候选 POI，无法生成路线");
    return {
      errors: [createError(
        node,
        "VALIDATION_ERROR",
        "无候选 POI，无法生成路线",
        false // 无法恢复，需要上游重试
      )],
    };
  }

  if (warnings.length > 0) {
    logWarn(node, "⚠️ 验证警告", warnings.map((w) => w.message).join(", "));
    return { warnings };
  } else {
    log(node, "✅ 验证通过");
    return {};
  }
}

// ===== Node 5: generateJourney (调用 Agent 2) =====

/**
 * 生成叙事路线
 * 调用 story-generator.agent
 */
export async function generateJourney(state: QuestStateType) {
  const node = "generateJourney";
  log(node, "🚀 开始执行");

  // 确保 poiCandidates 是数组
  const poiCandidates = state.poiCandidates || [];

  log(node, "📋 输入参数", {
    identity: state.card.identity,
    candidatesCount: poiCandidates.length,
    timePeriod: state.timePeriod,
    companion: state.companion,
  });

  const startTime = Date.now();

  try {
    const journey = await runStoryGenerator({
      card: {
        identity: state.card.identity,
        mood: state.card.mood,
        mission: state.card.mission,
        rarity: state.card.rarity,
      },
      poiCandidates: poiCandidates,
      timePeriod: state.timePeriod,
      companion: state.companion,
    });

    const elapsed = Date.now() - startTime;

    if (!journey) {
      logWarn(node, "❌ 生成失败");
      return {
        journey: undefined,
        errors: [createError(
          node,
          "AGENT_ERROR",
          "故事生成器返回空结果",
          true, // 可以重试
          { elapsed }
        )],
      };
    }

    log(node, "✅ Agent 执行完成", {
      elapsed: `${elapsed}ms`,
      scenesCount: journey.scenes?.length || 0,
      emotionArc: journey.emotion_arc,
    });

    log(node, "📖 故事开篇", journey.story_opening?.slice(0, 100) + "...");

    log(node, "🎬 场景列表", (journey.scenes || []).map((s) => ({
      order: s.order,
      scene_name: s.scene_name,
      location: s.location_name,
      emotion: s.emotion_tags,
    })));

    return {
      journey,
      error: undefined,
    };
  } catch (e) {
    const elapsed = Date.now() - startTime;
    logWarn(node, `❌ Agent 执行失败 (${elapsed}ms)`, e);

    return {
      journey: undefined,
      errors: [createError(
        node,
        "AGENT_ERROR",
        e instanceof Error ? e.message : String(e),
        true, // Agent 错误可能是暂时的
        { elapsed }
      )],
    };
  }
}
