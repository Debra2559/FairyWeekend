/**
 * adjust-journey
 * 接收当前 journey + 用户自然语言请求，返回调整后的 journey 与一句助手回复。
 */

import { LLMClient } from "../_shared/llmClient/lovable-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCENE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    order: { type: "number" },
    scene_name: { type: "string" },
    location_name: { type: "string" },
    location_type: { type: "string" },
    location_hint: { type: "string" },
    persona_narrative: { type: "string" },
    action_task: { type: "string" },
    stay_minutes: { type: "number" },
    emotion_tags: { type: "array", items: { type: "string" } },
    meituan_keyword: { type: "string" },
  },
  required: [
    "order",
    "scene_name",
    "location_name",
    "location_type",
    "location_hint",
    "persona_narrative",
    "action_task",
    "stay_minutes",
    "emotion_tags",
    "meituan_keyword",
  ],
};

const RESPONSE_SCHEMA = {
  name: "adjusted_journey",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      reply: { type: "string", description: "一句对用户的中文回复，不超过 60 字" },
      changed: { type: "boolean", description: "是否对路线做了修改" },
      journey: {
        type: "object",
        additionalProperties: false,
        properties: {
          story_opening: { type: "string" },
          emotion_arc: {
            type: "object",
            additionalProperties: false,
            properties: { start: { type: "string" }, end: { type: "string" } },
            required: ["start", "end"],
          },
          scenes: { type: "array", items: SCENE_SCHEMA },
          closing: { type: "string" },
        },
        required: ["story_opening", "emotion_arc", "scenes", "closing"],
      },
    },
    required: ["reply", "changed", "journey"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { card, city, journey, request, history = [] } = body ?? {};

    if (!journey?.scenes || !card?.identity || !request) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new LLMClient();

    const system = `你是一位贴心的本地行程改写助手。用户给了一份"今日剧本"路线，他想在原路线基础上做调整（换某一站、加一站、删一站、改顺序、调整时间、换风格等）。

规则：
1. 必须保留 journey 的整体结构（story_opening / emotion_arc / scenes / closing），输出完整 journey。
2. 不要无理由全盘重写。只改用户提到的部分，其余 scene 保持原样。
3. scenes 数量保持在 3-5 个之间。order 从 1 开始顺序递增。
4. 每个 scene 必填字段（见 schema），location_name 用真实地点的写法（"XX 咖啡"、"XX 书店"），location_type 用简短中文（咖啡馆 / 书店 / 公园 / 餐厅 / 酒吧 / 美术馆 等）。
5. persona_narrative 用人设视角的第二人称叙述，60 字左右。action_task 是一个具体可执行的动作。meituan_keyword 是用于美团搜索的关键词。
6. 如果用户的请求不清楚或与路线无关（比如纯闲聊），保留 journey 不变，changed=false，reply 中礼貌追问。
7. reply 用中文口语化的一句话，告诉用户你改了什么，≤60 字。

人设：${card.identity}（${card.mood}）
今日使命：${card.mission}
城市：${city || "未指定"}`;

    const historyBlock = Array.isArray(history) && history.length
      ? history.slice(-6).map((m: { role: string; text: string }) =>
          `${m.role === "user" ? "用户" : "助手"}：${m.text}`).join("\n")
      : "（无）";

    const prompt = `当前 journey JSON：
${JSON.stringify(journey)}

最近对话：
${historyBlock}

用户最新请求：
${request}

请输出修改后的 journey、是否改动 (changed)，以及一句给用户的回复 (reply)。`;

    const out = await client.askJSON<{
      reply: string;
      changed: boolean;
      journey: typeof journey;
    }>(prompt, RESPONSE_SCHEMA, system, { temperature: 0.5 });

    // 规范化 order
    if (out?.journey?.scenes?.length) {
      out.journey.scenes = out.journey.scenes
        .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
        .map((s: Record<string, unknown>, i: number) => ({ ...s, order: i + 1 }));
    }

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[adjust-journey]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
