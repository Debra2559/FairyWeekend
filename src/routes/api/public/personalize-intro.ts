import { createFileRoute } from "@tanstack/react-router";

interface Body {
  tags?: string[];
  freeText?: string;
  userTurns?: string[]; // 用户最近几条原话
  card: {
    identity: string;
    mood?: string;
    mission?: string;
    rarity?: string;
  };
  isReroll?: boolean;
}

export const Route = createFileRoute("/api/public/personalize-intro")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!body?.card?.identity) {
          return new Response("Missing card", { status: 400 });
        }

        const tagsLine = (body.tags || []).filter(Boolean).join("、");
        const turns = (body.userTurns || []).slice(-6).join(" / ");
        const sys = `你是「今日人设」的挑卡小助手。说话像朋友，简洁、温柔、有画面感。
任务：根据用户刚才在聊天里透露的状态/氛围/补充话，向他/她介绍你为什么挑了这张人设卡。
要求：
- 1–2 句，最多 45 个汉字
- 第二人称（你）
- 必须呼应用户说的至少一个具体信号（情绪、时长、氛围、原话）
- 不要复述卡名，不要书名号，不要 emoji 堆砌（可加 1 个克制 emoji）
- 不要"为你推荐这张卡"这种套话
- 若是"再换一张"，开头用"那这张试试——"或类似口语过渡`;

        const usr = `用户标签：${tagsLine || "（无）"}
用户原话：${turns || "（无）"}
卡片身份：${body.card.identity}
卡片状态：${body.card.mood || ""}
卡片使命：${body.card.mission || ""}
是否换卡：${body.isReroll ? "是" : "否"}

请直接输出那 1–2 句开场白，不要任何解释、引号或前后缀。`;

        try {
          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                temperature: 0.85,
                messages: [
                  { role: "system", content: sys },
                  { role: "user", content: usr },
                ],
              }),
              signal: request.signal,
            },
          );

          if (!upstream.ok) {
            const text = await upstream.text();
            return new Response(text || "AI failed", { status: upstream.status });
          }

          const json = (await upstream.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          let intro = (json.choices?.[0]?.message?.content || "").trim();
          // 清洗常见多余符号
          intro = intro.replace(/^[「『"'""]+|[」』"'""]+$/g, "").trim();
          if (!intro) intro = body.isReroll ? "那这张试试——" : "为你挑了这张卡 ✦";

          return new Response(JSON.stringify({ intro }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
