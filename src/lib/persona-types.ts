export type Rarity = "N" | "R" | "SR" | "SSR";

export interface PersonaCard {
  id: string;
  rarity: Rarity;
  identity: string;          // 身份
  mood: string;              // 今日状态
  mission: string;           // 今日使命
  colors: string[];          // 卡片配色（3 色）
  illustration_keyword: string;
  cover?: string;            // 卡面插画 URL（可选）
  story?: string;            // 背景故事（一段叙述，吸引用户）
  routes?: string[];         // 未来可能展开的路线（3 条左右）
  catchphrase?: string;      // 一句话台词 / 卡片签
  soundtrack?: string;       // 今天的 BGM 建议
  best_time?: string;        // 推荐时段
  companion?: string;        // 适合独自 / 结伴
  avoid?: string;            // 今天别做的事
  gift_from_city?: string;   // 城市可能送你的小礼物
  keywords?: string[];       // 关键词标签（3-5 个）
}

export interface JourneyScene {
  order: number;
  scene_name: string;            // 诗意命名
  location_name: string;
  location_type: string;
  location_hint: string;
  persona_narrative: string;     // 人设视角叙事
  action_task: string;           // 具体行动
  stay_minutes: number;
  emotion_tags: string[];
  meituan_keyword: string;
}

export interface Journey {
  story_opening: string;
  emotion_arc: { start: string; end: string };
  scenes: JourneyScene[];
  closing: string;
}

export interface SceneRecord {
  note?: string;
  photo?: string;        // 兼容旧版：单张
  photos?: string[];     // 新版：多张 data URL，最多 3 张
  mood?: string;         // emoji
  rating?: number;       // 1-5
  companion?: string;    // 同行人：独自 / 朋友 / 恋人 / 家人 / 同事
  reserved?: boolean;    // 是否已预约
  reservedAt?: number;   // 预约时间戳
  completedAt: number;
}

export interface JourneyRunState {
  card: PersonaCard;
  city?: string;
  journey: Journey;
  completedSceneOrders: number[];
  sceneRecords?: Record<number, SceneRecord>;
  createdAt: number;
}
