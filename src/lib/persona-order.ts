/**
 * 以人设之名下单 —— 把"今天你是 XX"翻译成商家能看懂的备注
 * 以及把整条路线打包成可直接发给同伴的可执行文案
 */
import type { PersonaCard, JourneyScene } from "@/lib/persona-types";
import type { VenueKind } from "@/components/VenueIcon";

/** 按场所类型 + 人设关键词，拼出"商家备注" */
export function buildPersonaOrderNote(
  card: Pick<PersonaCard, "identity" | "mood" | "keywords" | "avoid">,
  scene: Pick<JourneyScene, "location_name" | "stay_minutes" | "emotion_tags">,
  kind: VenueKind,
): { title: string; note: string; meituanRemark: string } {
  const identity = card.identity || "今日主角";
  const mood = card.mood || "";
  const kws = (card.keywords || []).slice(0, 3);
  const tags = (scene.emotion_tags || []).slice(0, 2);
  const avoid = card.avoid?.trim();

  // 按场景类型选一个"商家能落地"的请求
  const ask = pickActionableAsk(kind, identity, mood, tags);

  const meituanRemark = `备注：今天这位客人是「${identity}」，${ask}${
    avoid ? `（避免：${avoid}）` : ""
  }`;

  const note = [
    `今天我是 · ${identity}`,
    mood && `状态：${mood}`,
    kws.length && `关键词：${kws.join(" / ")}`,
    `请按这个角色给我准备「${scene.location_name}」：`,
    `→ ${ask}`,
    avoid && `× 今天别给我：${avoid}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: `以「${identity}」之名下单`,
    note,
    meituanRemark,
  };
}

function pickActionableAsk(
  kind: VenueKind,
  identity: string,
  _mood: string,
  tags: string[],
): string {
  const id = identity;
  const calm = tags.some((t) => /静|独|安|沉|思/.test(t));
  const lively = tags.some((t) => /闹|热|聚|嗨|燃/.test(t));

  switch (kind) {
    case "restaurant":
    case "noodle":
      return calm
        ? `安排一个安静的角落位，菜按"${id}今天该吃的"来推荐，少油少酱`
        : lively
          ? `安排一桌靠窗或开放区，菜选这家最招牌的两三道，分量给到位`
          : `按"${id}的习惯"配两菜一汤，照顾胃也照顾心情`;
    case "cafe":
    case "bakery":
    case "dessert":
      return calm
        ? `留一个能写字/翻书的位置，咖啡按"${id}今天该喝的"来出，淡一点`
        : `推荐这家今天最适合"${id}"的一杯，可以拍照的那种`;
    case "bar":
      return `按"${id}今天的心情"调一杯，酒精度别太高，能让我说话也能让我安静`;
    case "spa":
      return `给"${id}"安排今天最该放松的部位，节奏慢一点，结束后留五分钟发呆`;
    case "museum":
    case "gallery":
      return `如果有"${id}"会感兴趣的临展或导览，请帮我留意时段`;
    case "cinema":
      return `按"${id}今天该看的片"推荐一场，座位要居中靠后`;
    case "park":
    case "river":
      return `走最适合"${id}"的那条小路，能看到树/水/天的地方多停一会`;
    case "flower":
    case "plant":
      return `挑一束"${id}今天会带回家"的花/植，颜色偏${calm ? "冷调" : "暖调"}`;
    case "bookstore":
      return `推荐一本"${id}今天会翻开的书"，薄一点，能在 ${30} 分钟内读完一篇`;
    case "market":
      return `带我看这家今天最值得"${id}"出手的三样东西，价格亲民那种`;
    case "temple":
      return `给"${id}"留几分钟安静上香的时间，避开旅行团高峰`;
    default:
      return `按"${id}今天的状态"给我一个"刚刚好"的方案，不用最贵但要最合适`;
  }
}

// ============ 行程文案：发给同伴一键照做 ============

export interface ShareItineraryInput {
  card: Pick<PersonaCard, "identity" | "mood" | "catchphrase">;
  scenes: JourneyScene[];
  city?: string;
  transportLabel: string;
  transportIcon: string;
  routeHref: string;
  startAt?: Date;         // 默认 = 现在 + 15min
  groupLabel?: string;    // "二人世界 💞" / "朋友局 🍻"
  reservedOrders?: number[];
}

export function buildShareItinerary(input: ShareItineraryInput): string {
  const {
    card,
    scenes,
    city,
    transportLabel,
    transportIcon,
    routeHref,
    startAt,
    groupLabel,
    reservedOrders = [],
  } = input;

  const start = startAt ?? new Date(Date.now() + 15 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

  let cursor = new Date(start);
  const lines: string[] = [];

  lines.push(`【今天我是 · ${card.identity}】`);
  if (groupLabel) lines.push(`同行：${groupLabel}`);
  if (card.mood) lines.push(`状态：${card.mood}`);
  lines.push(`出发：${fmt(start)} · ${transportIcon}${transportLabel}${city ? ` · ${city}` : ""}`);
  lines.push("");
  lines.push("路线：");

  scenes.forEach((s, i) => {
    const at = fmt(cursor);
    const tag = reservedOrders.includes(s.order) ? " ✓已预约" : "";
    lines.push(`${i + 1}. ${at} 「${s.scene_name}」`);
    lines.push(`   ${s.location_name}${tag} · 停留~${s.stay_minutes}min`);
    if (s.action_task) lines.push(`   要做：${s.action_task}`);
    cursor = new Date(cursor.getTime() + (s.stay_minutes || 30) * 60 * 1000 + 15 * 60 * 1000);
  });

  if (card.catchphrase) {
    lines.push("");
    lines.push(`—— ${card.catchphrase}`);
  }
  lines.push("");
  lines.push(`地图：${routeHref}`);
  return lines.join("\n");
}
