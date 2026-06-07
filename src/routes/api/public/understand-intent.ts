import { createFileRoute } from "@tanstack/react-router";
import { callLLMJSON } from "@/lib/llm";

interface Body {
  text: string;
  currentStep: string;
}

interface IntentResult {
  isCompleteIntent: boolean;
  extractedInfo: Record<string, string>;
  replyIfComplete: string;
}

export const Route = createFileRoute("/api/public/understand-intent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const text = body.text || "";
        const currentStep = body.currentStep || "mood";

        const sys = `你是「今日人设」卡片推荐助手的意图理解模块。

任务：判断用户的输入是否已经包含了足够的信息来推荐一张卡片。

判断标准：
- 如果用户表达了完整或较完整的周末计划意图（包括状态/心情、时间、地点、氛围、人数等其中的多个要素），应该立即推荐
- 如果用户只是简单回答了一个维度（如"想被治愈"或"半天"），需要继续问答
- 用户输入越长、信息越丰富，越可能需要立即推荐

输出格式（JSON）：
{
  "isCompleteIntent": true/false,
  "extractedInfo": {
    "mood": "用户的心情状态",
    "duration": "时间长度",
    "vibe": "想要的氛围",
    "location": "地点偏好",
    "companion": "同行人数/是否独处",
    "transport": "交通方式"
  },
  "replyIfComplete": "如果 isCompleteIntent 为 true，这里是给用户的简短回复（15-25字，表示理解了用户的需求）"
}

注意：
- isCompleteIntent 为 true 时，系统会直接推荐卡片，不再追问
- isCompleteIntent 为 false 时，系统会继续当前的问答流程
- extractedInfo 里的字段可以为空字符串，表示用户没有提到`;

        const usr = `当前问答阶段：${currentStep}
用户输入：「${text}」

请判断用户的意图完整度。`;

        try {
          const result = await callLLMJSON<IntentResult>(
            [
              { role: "system", content: sys },
              { role: "user", content: usr },
            ],
            { temperature: 0.3 }
          );

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[understand-intent] Error:", err);
          // 回退：意图不完整
          return new Response(
            JSON.stringify({
              isCompleteIntent: false,
              extractedInfo: {},
              replyIfComplete: "",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
