import { createFileRoute } from "@tanstack/react-router";
import { callLLMJSON } from "@/lib/llm";

interface CardInfo {
  id: string;
  identity: string;
  mood: string;
  mission: string;
  rarity: string;
  keywords: string[];
}

interface Body {
  tags?: string[];
  freeText?: string;
  userTurns?: string[];
}

interface RecommendResult {
  cardId: string;
  reason: string;
}

// 所有卡片信息（用于给大模型选择）
const CARD_POOL: CardInfo[] = [
  {
    id: "card_001",
    identity: "在异乡漂泊的植物学家",
    mood: "对城市重新感到好奇",
    mission: "寻找三种让你感到安心的气味",
    rarity: "SR",
    keywords: ["气味", "漫游", "植物", "治愈", "独处"],
  },
  {
    id: "card_002",
    identity: "喜欢在家的人，今天破例出门",
    mood: "有点懒，但想被惊喜",
    mission: "找一个让你想多坐一会儿的地方",
    rarity: "N",
    keywords: ["慢生活", "咖啡", "窝着", "斜光", "猫"],
  },
  {
    id: "card_003",
    identity: "刚从长期隐居中回归人间的人",
    mood: "对一切感到新鲜和陌生",
    mission: "和一个陌生人说一句话",
    rarity: "SSR",
    keywords: ["复出", "陌生人", "再校准", "勇敢", "市集"],
  },
  {
    id: "card_004",
    identity: "在城市里寻找野生感的人",
    mood: "有点燥，需要出口",
    mission: "走进一条没走过的街，走到尽头为止",
    rarity: "R",
    keywords: ["徒步", "随机", "野生", "脱网", "城市"],
  },
  {
    id: "card_005",
    identity: "今天决定先把自己当回事的人",
    mood: "有点脆弱，但想被温柔对待",
    mission: "给自己买一样平时舍不得买的东西",
    rarity: "SR",
    keywords: ["疗愈", "宠自己", "重启", "仪式感", "独处"],
  },
  {
    id: "card_006",
    identity: "某个平行宇宙里选择留在这座城市的你",
    mood: "带着遗憾，也带着释然",
    mission: "去一个「如果当初留下来会常去」的地方",
    rarity: "SSR",
    keywords: ["平行", "如果", "怀旧", "黄昏", "城市哲学"],
  },
  {
    id: "card_007",
    identity: "把今天当作最后一个周末的人",
    mood: "珍惜，有点感性",
    mission: "拍下三张「值得被记住」的画面",
    rarity: "R",
    keywords: ["珍惜", "记忆", "摄影", "黄昏", "感性"],
  },
  {
    id: "card_008",
    identity: "想假装自己是本地人的外地人",
    mood: "好奇，有点紧张",
    mission: "去一家没有英文菜单的小馆子吃饭",
    rarity: "N",
    keywords: ["本地", "市井", "苍蝇馆子", "方言", "味道"],
  },
  {
    id: "card_009",
    identity: "想被熟人包围、笑得大声一点的人",
    mood: "今天不想一个人",
    mission: "约一个许久没见的人，吃顿饭再散散步",
    rarity: "R",
    keywords: ["重逢", "饭局", "热闹", "夜晚", "聊天"],
  },
  {
    id: "card_010",
    identity: "想钻进旧时光里的人",
    mood: "想被慢一点的东西包住",
    mission: "找一家旧唱片店或老书店，待到天黑",
    rarity: "SR",
    keywords: ["旧物", "唱片", "老书店", "慢", "怀旧"],
  },
  {
    id: "card_017",
    identity: "下班后偷一小时给自己的人",
    mood: "累，但还不想立刻回家",
    mission: "在公司一公里内找一个能喘口气的角落",
    rarity: "SR",
    keywords: ["下班", "解压", "夕阳", "独处", "工作日"],
  },
  {
    id: "card_018",
    identity: "在陌生城市只有半天空档的人",
    mood: "时间紧，但贪心想多体验一点",
    mission: "在 4 小时内抓到这座城市的「一个味道」",
    rarity: "R",
    keywords: ["短停留", "陌生城市", "本地味", "高效", "出差"],
  },
  {
    id: "card_019",
    identity: "雨天宅不住的人",
    mood: "被雨困着，但不想认输",
    mission: "找一个被雨声衬得更暖的室内角落",
    rarity: "N",
    keywords: ["雨天", "室内", "咖啡馆", "窗边", "白噪音"],
  },
  {
    id: "card_021",
    identity: "深夜睡不着、想出门走一段的人",
    mood: "脑子停不下来，身体却想被夜风冷一下",
    mission: "在 0 点之后，走完一段平时白天走的路",
    rarity: "R",
    keywords: ["深夜", "失眠", "散步", "便利店", "清醒"],
  },
  {
    id: "card_022",
    identity: "想流一身汗的人",
    mood: "憋得慌，想用身体把脑子放空",
    mission: "用脚或轮子，在城市里画一条属于今天的轨迹",
    rarity: "R",
    keywords: ["运动", "跑步", "骑行", "出汗", "解压"],
  },
  {
    id: "card_023",
    identity: "想给自己充点灵感电的人",
    mood: "枯了，需要新的东西灌进脑子",
    mission: "带一本本子出门，记下三个让你心动的细节",
    rarity: "SR",
    keywords: ["灵感", "采风", "美术馆", "速写", "观察"],
  },
];

export const Route = createFileRoute("/api/public/recommend-card")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const tagsLine = (body.tags || []).filter(Boolean).join("、");
        const turns = (body.userTurns || []).slice(-6).join(" / ");
        const freeText = body.freeText || "";

        // 构建卡片列表文本
        const cardsText = CARD_POOL.map(
          (c, i) =>
            `${i + 1}. [${c.id}] ${c.identity}（${c.rarity}）\n   状态：${c.mood}\n   使命：${c.mission}\n   关键词：${c.keywords.join("、")}`
        ).join("\n\n");

        const sys = `你是「今日人设」的卡片推荐助手。
任务：根据用户在聊天中透露的心情、状态、时间、氛围等，从卡片库里推荐最合适的一张。

你需要：
1. 理解用户的真实需求和情绪状态
2. 匹配卡片的状态(mood)和使命(mission)
3. 考虑卡片的关键词与用户表达的关联
4. 返回最匹配的卡片 ID

输出格式要求：
- 直接输出 JSON 对象，不要任何其他文字
- 格式：{"cardId": "card_xxx", "reason": "简短理由（15字内）"}`;

        const usr = `用户信息：
- 选择标签：${tagsLine || "（无）"}
- 用户原话：${turns || "（无）"}
- 补充说明：${freeText || "（无）"}

可选卡片：
${cardsText}

请推荐最合适的一张卡片。`;

        try {
          const result = await callLLMJSON<RecommendResult>(
            [
              { role: "system", content: sys },
              { role: "user", content: usr },
            ],
            { temperature: 0.7 }
          );

          // 验证卡片 ID 是否有效
          const validCard = CARD_POOL.find((c) => c.id === result.cardId);
          if (!validCard) {
            // 回退：随机选一张
            const fallback = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
            result.cardId = fallback.id;
            result.reason = "随机推荐";
          }

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[recommend-card] Error:", err);
          // 回退：随机选一张
          const fallback = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
          return new Response(
            JSON.stringify({ cardId: fallback.id, reason: "随机推荐" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
