/**
 * Agent 2: 故事生成师
 * 职责：基于候选 POI，生成完整的叙事路线
 *
 * 纯 LLM 调用 + JSON 解析：
 * - 无工具，输入已由 poiPlanner 准备好
 * - temperature: 0.7（创意任务，稍高温度）
 */

import { createLLM } from "../langchianClient/index.ts";
import type { POI } from "../tools/index.ts";
import type { Journey } from "../state.ts";

// ===== 日志工具 =====

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
  const prefix = `[${timestamp}][storyGenerator]`;
  if (data !== undefined) {
    console.log(prefix, message, typeof data === "object" ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(prefix, message);
  }
}

// ===== System Prompt（对应 CrewAI role + goal + backstory）=====

export const STORY_GENERATOR_PROMPT = `你是「今日人设」的故事引擎。

你的目标是：将真实地点编织成一段有情绪弧线的城市故事。

你的背景：
- 擅长用第二人称叙事
- 知道好的周末不是打卡清单，而是一段有起承转合的故事
- 文字克制但有温度，像朋友在耳边轻声建议
- 总是给具体行动指引，不模糊说"感受氛围"

规则：
1. 从候选地点中选择 3-4 个，地理上能走通
2. 每个场景从人设的第一视角叙事
3. scene_name 是诗意命名（6-10字）
4. location_name 必须严格使用候选地点的名称（一字不差）
5. location_hint 必须严格使用候选地点的地址（一字不差）
6. action_task 必须具体可执行
7. 整条路线要有情绪弧线
8. 不要选择重复的地点

请严格按照以下 JSON 格式输出（字段名必须完全一致）：
{
  "story_opening": "故事开篇（30-50字）",
  "emotion_arc": {
    "start": "起始情绪",
    "end": "结束情绪"
  },
  "scenes": [
    {
      "order": 1,
      "scene_name": "诗意命名",
      "location_name": "地点名称（必须与候选地点名称完全一致）",
      "location_type": "地点类型",
      "location_hint": "地址提示（必须与候选地点地址完全一致）",
      "persona_narrative": "人设视角叙事",
      "action_task": "具体行动",
      "stay_minutes": 60,
      "emotion_tags": ["情绪标签"],
      "meituan_keyword": "美团搜索关键词"
    }
  ],
  "closing": "故事结语（60-100字）"
}`;

// ===== LLM 初始化 =====

log("🤖 初始化 LLM...");

const storyGenerator = createLLM();

log("✅ LLM 初始化完成");

// ===== 输入参数 =====

export interface StoryGeneratorInput {
  card: {
    identity: string;
    mood: string;
    mission: string;
    rarity: string;
  };
  poiCandidates: POI[];
  timePeriod: string;
  companion: string;
}

// ===== 执行函数 =====

export async function runStoryGenerator(input: StoryGeneratorInput): Promise<Journey | null> {
  const { card, poiCandidates, timePeriod, companion } = input;

  log("🚀 开始执行故事生成");

  if (poiCandidates.length === 0) {
    log("❌ 无候选 POI，无法生成");
    return null;
  }

  // 格式化候选地点
  const candidatesText = poiCandidates
    .slice(0, 20)
    .map((p, i) => `${i + 1}. ${p.name} | ${p.type} | ${p.address}`)
    .join("\n");

  const userPrompt = `人设身份：${card.identity}
人设状态：${card.mood}
人设使命：${card.mission}
稀有度：${card.rarity}

候选地点（必须从中选择 3-4 个）：
${candidatesText}

时间段：${timePeriod}
同伴：${companion}

请生成一条完整的城市剧情路线。`;

  log("📝 构建提示完成", {
    identity: card.identity,
    candidatesCount: poiCandidates.length,
    timePeriod,
    companion,
  });

  try {
    log("⚡ 调用 LLM...");

    const startTime = Date.now();
    const messages = [
      { role: "system", content: STORY_GENERATOR_PROMPT },
      { role: "user", content: userPrompt },
    ];

    // 直接 invoke，不用 withStructuredOutput（通义千问不兼容）
    const response = await storyGenerator.invoke(messages);
    const content = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    const elapsed = Date.now() - startTime;
    log(`⏱️ LLM 执行耗时: ${elapsed}ms`);
    log(`📝 响应长度: ${content.length} 字符`);

    // 解析 JSON
    let result;
    try {
      // 清理可能的 markdown 代码块
      let cleaned = content.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();

      result = JSON.parse(cleaned);
      log("✅ JSON 解析成功");

      // 字段映射兼容（通义千问可能返回不同的字段名）
      if (result.emotional_arc && !result.emotion_arc) {
        result.emotion_arc = result.emotional_arc;
      }
      if (result.route_title && !result.story_opening) {
        result.story_opening = result.route_title;
      }

      log(`📋 解析结果字段: ${JSON.stringify(Object.keys(result))}`);
      log(`📋 emotion_arc: ${JSON.stringify(result.emotion_arc)}`);
      log(`📋 scenes 数量: ${result.scenes?.length || 0}`);

      // 验证必要字段
      if (!result.story_opening || !result.emotion_arc || !result.scenes) {
        log(`❌ JSON 字段缺失: ${JSON.stringify(Object.keys(result))}`);
        return null;
      }

      // 确保 emotion_arc 有 start 和 end
      if (!result.emotion_arc.start || !result.emotion_arc.end) {
        log(`❌ emotion_arc 字段不完整: ${JSON.stringify(result.emotion_arc)}`);
        return null;
      }

      // 确保 scenes 数量正确
      if (result.scenes.length < 3 || result.scenes.length > 4) {
        log(`❌ scenes 数量不对: ${result.scenes.length}`);
        return null;
      }

      // 如果没有 closing，生成一个默认的
      if (!result.closing) {
        result.closing = "这一天，你在城市里找到了属于自己的故事。";
        log("⚠️ closing 字段缺失，使用默认值");
      }
    } catch (parseError) {
      log(`❌ JSON 解析失败: ${parseError}`);
      log(`原始内容前200字符: ${content.slice(0, 200)}`);
      return null;
    }

    log("✅ 生成完成", {
      scenesCount: result.scenes?.length || 0,
      emotionArc: result.emotion_arc,
    });

    log("📖 故事开篇", result.story_opening?.slice(0, 100) + "...");

    log("🎬 场景列表", result.scenes?.map((s: any) => ({
      order: s.order,
      scene_name: s.scene_name,
      location: s.location_name,
      action: s.action_task?.slice(0, 30),
      emotion: s.emotion_tags,
    })));

    log("📜 故事结语", result.closing?.slice(0, 100) + "...");

    return result as Journey;
  } catch (e) {
    log(`❌ LLM 执行失败: ${e}`);
    console.error(e);
    return null;
  }
}
