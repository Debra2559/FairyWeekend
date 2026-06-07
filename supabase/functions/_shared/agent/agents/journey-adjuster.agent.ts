/**
 * Agent: Journey Adjuster
 * 职责：根据用户自然语言请求调整现有行程
 *
 * 使用 createReactAgent 实现 ReAct 模式：
 * - Agent 自主决定是否需要调用工具搜索新地点
 * - 工具：search_poi（复用现有）
 */

import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { createLLM } from "../langchianClient/index.ts";
import { searchPoiTool, type POI } from "../tools/index.ts";

// ===== 日志工具 =====

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
  const prefix = `[${timestamp}][journeyAdjuster]`;
  if (data !== undefined) {
    console.log(prefix, message, typeof data === "object" ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(prefix, message);
  }
}

// ===== System Prompt =====

export const JOURNEY_ADJUSTER_PROMPT = `你是一位贴心的城市行程调整助手。

## 目标
根据用户的自然语言请求，调整现有的城市探索行程。

## 能力
- 可以搜索真实地点（通过 search_poi 工具）
- 可以修改、增加、删除、重排场景
- 必须保持 journey 整体结构（story_opening / emotion_arc / scenes / closing）

## 工作原则
1. **最小改动原则**：只改用户提到的部分，其余 scene 保持原样
2. **真实地点优先**：需要新地点时必须调用 search_poi，不编造地点
3. **结构完整原则**：输出完整的 journey，包含所有必需字段
4. **场景数量控制**：scenes 保持在 3-5 个之间

## 工具使用规则
- 需要新地点时才调用 search_poi
- 一次传入 1-3 个精准关键词（如：["独立书店"]、["咖啡馆", "安静"]）
- 从返回结果中选择最合适的地点
- 简单操作（删除、重排）无需调用工具

## 常见调整场景
- **换站**：用户说"把第X站换成Y" → 搜索 Y 类型地点 → 替换对应 scene
- **加站**：用户说"加一站X" → 搜索 X 类型地点 → 插入新 scene
- **删站**：用户说"删掉第X站" → 直接删除，调整 order
- **重排**：用户说"把顺序倒过来" → 直接重排，无需工具

## 输出格式（严格遵守）
完成调整后，你必须输出一个 JSON 对象，格式如下：

{
  "reply": "一句话回复用户，说明改了什么（≤60字）",
  "changed": true,
  "journey": {
    "story_opening": "原样保留或微调",
    "emotion_arc": { "start": "...", "end": "..." },
    "scenes": [
      {
        "order": 1,
        "scene_name": "诗意场景名",
        "location_name": "真实地点名",
        "location_type": "地点类型",
        "location_hint": "位置提示",
        "persona_narrative": "人设视角叙事",
        "action_task": "具体行动",
        "stay_minutes": 60,
        "emotion_tags": ["情绪1", "情绪2"],
        "meituan_keyword": "搜索关键词"
      }
    ],
    "closing": "原样保留或微调"
  }
}

注意：
- changed 为 true 表示有实际改动，false 表示未改动或请求不清
- 如果用户请求不清楚，保持 journey 不变，在 reply 中礼貌追问
- 必须输出有效的 JSON，不要添加任何其他文字`;

// ===== 创建 Agent =====

log("🤖 初始化 Agent...");

const llm = createLLM();

export const journeyAdjusterAgent = createReactAgent({
  llm,
  tools: [searchPoiTool],
  prompt: JOURNEY_ADJUSTER_PROMPT,
});

log("✅ Agent 初始化完成");

// ===== 输入参数 =====

export interface JourneyAdjusterInput {
  journey: {
    story_opening: string;
    emotion_arc: { start: string; end: string };
    scenes: Array<{
      order: number;
      scene_name: string;
      location_name: string;
      location_type: string;
      location_hint: string;
      persona_narrative: string;
      action_task: string;
      stay_minutes: number;
      emotion_tags: string[];
      meituan_keyword: string;
    }>;
    closing: string;
  };
  request: string;
  city: string;
  card?: {
    identity: string;
    mood: string;
    mission: string;
  };
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}

// ===== 输出结果 =====

export interface JourneyAdjusterOutput {
  reply: string;
  changed: boolean;
  journey: JourneyAdjusterInput["journey"];
}

// ===== 执行函数 =====

export async function runJourneyAdjuster(input: JourneyAdjusterInput): Promise<JourneyAdjusterOutput> {
  const { journey, request, city, card, history = [] } = input;

  log("🚀 开始执行行程调整");

  // 构建用户提示
  const userPrompt = `**当前行程**
${JSON.stringify(journey, null, 2)}

**城市**：${city}

${card ? `**人设背景**
- 身份：${card.identity}
- 状态：${card.mood}
- 使命：${card.mission}
` : ""}

${history.length > 0 ? `**最近对话**
${history.slice(-6).map(m => `${m.role === "user" ? "用户" : "助手"}：${m.text}`).join("\n")}
` : ""}

**用户请求**
${request}

请根据用户请求调整行程，输出调整后的 journey、是否改动 (changed)，以及一句回复 (reply)。`;

  log("📝 构建提示完成", {
    city,
    hasCard: !!card,
    historyLength: history.length,
    requestLength: request.length,
  });

  try {
    log("⚡ 调用 createReactAgent (流式模式)...");

    const startTime = Date.now();
    let stepCount = 0;

    // 使用 stream 模式
    const stream = await journeyAdjusterAgent.stream(
      {
        messages: [{ role: "user", content: userPrompt }],
      },
      {
        recursionLimit: 5, // 降低限制，调整任务通常 1-2 步即可
      }
    );

    // 累积所有消息
    const allMessages: any[] = [];

    for await (const chunk of stream) {
      stepCount++;

      for (const [nodeName, nodeOutput] of Object.entries(chunk)) {
        log(`  🔍 节点: ${nodeName}, 输出类型: ${typeof nodeOutput}`);

        const output = nodeOutput as any;

        // nodeOutput 是一个对象，包含 messages 数组
        if (output && typeof output === "object" && Array.isArray(output.messages)) {
          log(`  📊 messages 数组长度: ${output.messages.length}`);
          const lastMsg = output.messages[output.messages.length - 1];
          if (lastMsg) {
            const msgType = Array.isArray(lastMsg.id)
              ? lastMsg.id.join(".")
              : (lastMsg.id || lastMsg.type || "unknown");
            log(`🔄 步骤 ${stepCount} | 节点: ${nodeName} | 消息类型: ${msgType}`);

            // 工具调用
            if (lastMsg.kwargs?.tool_calls?.length) {
              const tools = lastMsg.kwargs.tool_calls.map((tc: any) => tc.name);
              log(`  🔧 LLM 调用工具: ${tools.join(", ")}`);
            }

            // 工具返回
            if (lastMsg.kwargs?.name) {
              const toolName = lastMsg.kwargs.name;
              const content = typeof lastMsg.kwargs.content === "string"
                ? lastMsg.kwargs.content.slice(0, 200)
                : "...";
              log(`  📥 工具返回 (${toolName}): ${content}`);
            }

            // LLM 文本回复
            if (lastMsg.kwargs?.content && typeof lastMsg.kwargs.content === "string" && !lastMsg.kwargs?.name && !lastMsg.kwargs?.tool_calls) {
              log(`  💬 LLM 回复: ${lastMsg.kwargs.content.slice(0, 200)}`);
            }

            // 累积消息
            allMessages.push(lastMsg);
            log(`  ✅ 消息已累积，当前总数: ${allMessages.length}`);
          }
        }
      }
    }

    const elapsed = Date.now() - startTime;
    log(`⏱️ Agent 执行耗时: ${elapsed}ms, 共 ${stepCount} 步`);

    // 构建包含所有消息的状态对象
    const finalState = { messages: allMessages };

    // 从最终状态提取结果
    const result = extractAdjustmentFromResult(finalState, journey);

    log(`✅ 提取完成`, {
      changed: result.changed,
      replyLength: result.reply.length,
      scenesCount: result.journey.scenes.length,
    });

    return result;
  } catch (e) {
    log(`❌ Agent 执行失败: ${e}`);
    console.error(e);
    return {
      reply: "抱歉，调整失败了，请再试一次。",
      changed: false,
      journey,
    };
  }
}

// ===== 辅助函数：从 Agent 结果中提取调整结果 =====

function extractAdjustmentFromResult(
  result: unknown,
  originalJourney: JourneyAdjusterInput["journey"]
): JourneyAdjusterOutput {
  const messages = (result as { messages: unknown[] }).messages || [];

  log(`🔍 开始提取结果，共 ${messages.length} 条消息`);

  // 从最后一条消息中提取 JSON
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const content = (msg as { content: unknown }).content;

    if (typeof content === "string") {
      log(`📝 消息 ${i + 1} 内容预览:`, content.slice(0, 300));

      try {
        // 尝试提取 JSON（可能包含在 Markdown 代码块中）
        let jsonStr = content;

        // 提取 ```json ... ``` 中的内容
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
          log(`✂️ 提取到 JSON 代码块`);
        }

        const parsed = JSON.parse(jsonStr);
        log(`✅ JSON 解析成功，检查字段...`);

        // 检查是否包含必需字段
        if (parsed && typeof parsed.reply === "string" && typeof parsed.changed === "boolean") {
          log(`✅ 包含必需字段: reply="${parsed.reply.slice(0, 30)}", changed=${parsed.changed}`);

          // 验证 journey 结构
          if (parsed.journey && Array.isArray(parsed.journey.scenes)) {
            log(`✅ journey.scenes 存在，共 ${parsed.journey.scenes.length} 个场景`);

            // 规范化 order
            parsed.journey.scenes = parsed.journey.scenes
              .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
              .map((s: Record<string, unknown>, idx: number) => ({ ...s, order: idx + 1 }));

            return {
              reply: parsed.reply,
              changed: parsed.changed,
              journey: parsed.journey,
            };
          } else {
            log(`❌ journey.scenes 不存在或不是数组`);
          }
        } else {
          log(`❌ 缺少必需字段或类型错误`);
        }
      } catch (e) {
        log(`❌ JSON 解析失败: ${e}`);
        // 解析失败，继续尝试下一条消息
      }
    }
  }

  // 如果无法提取，返回原始 journey
  log("⚠️ 无法从 Agent 结果中提取有效 JSON，返回原始 journey");
  return {
    reply: "调整完成了，但格式有点问题，请重试。",
    changed: false,
    journey: originalJourney,
  };
}
