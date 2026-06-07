import type { PersonaCard, Rarity } from "./persona-types";
import cover001 from "@/assets/persona/card_001.webp";
import cover002 from "@/assets/persona/card_002.webp";
import cover003 from "@/assets/persona/card_003.webp";
import cover004 from "@/assets/persona/card_004.webp";
import cover005 from "@/assets/persona/card_005.webp";
import cover006 from "@/assets/persona/card_006.webp";
import cover007 from "@/assets/persona/card_007.webp";
import cover008 from "@/assets/persona/card_008.webp";
import cover009 from "@/assets/persona/card_009.webp";
import cover010 from "@/assets/persona/card_010.webp";
import cover017 from "@/assets/persona/card_017.webp";
import cover018 from "@/assets/persona/card_018.webp";
import cover019 from "@/assets/persona/card_019.webp";
import cover021 from "@/assets/persona/card_021.webp";
import cover022 from "@/assets/persona/card_022.webp";
import cover023 from "@/assets/persona/card_023.webp";

const COVERS: Record<string, string> = {
  card_001: cover001,
  card_002: cover002,
  card_003: cover003,
  card_004: cover004,
  card_005: cover005,
  card_006: cover006,
  card_007: cover007,
  card_008: cover008,
  card_009: cover009,
  card_010: cover010,
  card_017: cover017,
  card_018: cover018,
  card_019: cover019,
  card_021: cover021,
  card_022: cover022,
  card_023: cover023,
};



const _PERSONA_CARDS_BASE: PersonaCard[] = [
  {
    id: "card_001",
    rarity: "SR",
    identity: "在异乡漂泊的植物学家",
    mood: "对城市重新感到好奇",
    mission: "寻找三种让你感到安心的气味",
    colors: ["#f0e6d3", "#8fbc8f", "#d4a896"],
    illustration_keyword: "botanical_wanderer",
    story: "TA 来到这座城市的第七年，依然记不住所有的路名，却开始记得每一棵长在墙缝里的草。今天的 TA 想用鼻子重新认识这里——气味比任何地图都诚实。",
    catchphrase: "城市不记得你，但草记得。",
    soundtrack: "Sigur Rós《Hoppípolla》或下雨白噪音",
    best_time: "上午 10 点到午后 3 点，阳光斜着走",
    companion: "适合独自，最好戴一副降噪耳机",
    avoid: "别看导航地图，让脚自己挑路口",
    gift_from_city: "一片粘在鞋底的、不知名的小叶子",
    keywords: ["气味", "漫游", "植物", "治愈", "独处"],
    routes: [
      "去一座老花市，挑一束没听过名字的花",
      "钻进一家中药铺，闻完所有抽屉",
      "在公园里席地而坐，闭眼听一首歌再走",
    ],
  },
  {
    id: "card_002",
    rarity: "N",
    identity: "喜欢在家的人，今天破例出门",
    mood: "有点懒，但想被惊喜",
    mission: "找一个让你想多坐一会儿的地方",
    colors: ["#faf0e6", "#deb887", "#f5deb3"],
    illustration_keyword: "cozy_homebody",
    story: "TA 在床上挣扎了一上午，最后还是穿上了出门的鞋。不为别的，只是想被某个小角落收留一下下——一杯热的、一束斜光、一只睡着的猫，都好。",
    catchphrase: "出门只是为了更想回家。",
    soundtrack: "City Pop 慢摇 / 大泷詠一《君は天然色》",
    best_time: "下午 2 点到傍晚，光线最温柔的时候",
    companion: "一个人最舒服，或者带本书当借口",
    avoid: "别排长队、别去人挤人的网红地",
    gift_from_city: "一杯免费续的、刚刚好烫的热水",
    keywords: ["慢生活", "咖啡", "窝着", "斜光", "猫"],
    routes: [
      "找一家可以坐很久不被赶的咖啡店",
      "去一家有猫/狗的小店，让动物挑你",
      "买一本书，去河边长椅上看到太阳偏西",
    ],
  },
  {
    id: "card_003",
    rarity: "SSR",
    identity: "刚从长期隐居中回归人间的人",
    mood: "对一切感到新鲜和陌生",
    mission: "和一个陌生人说一句话",
    colors: ["#e8e0f0", "#b19cd9", "#f8f0ff"],
    illustration_keyword: "returning_wanderer",
    story: "很久没和世界正面接触了。TA 像刚出土的植物，对光线、声音和人都还在重新校准。但 TA 决定今天迈出第一步——哪怕只是问一句路。",
    catchphrase: "重新出现，不需要解释。",
    soundtrack: "坂本龙一《Merry Christmas Mr. Lawrence》",
    best_time: "傍晚 5 点到 8 点，人潮最有温度的时段",
    companion: "独自前往，但允许被陌生人短暂打扰",
    avoid: "别给自己设 KPI，今天能出门就是胜利",
    gift_from_city: "陌生人的一句「不客气」或一个点头",
    keywords: ["复出", "陌生人", "再校准", "勇敢", "市集"],
    routes: [
      "去人最多的市集，被人潮裹着走一圈",
      "在书店随机问店员一本书的推荐",
      "找一场不熟悉的展览，留下来听一场讲解",
    ],
  },
  {
    id: "card_004",
    rarity: "R",
    identity: "在城市里寻找野生感的人",
    mood: "有点燥，需要出口",
    mission: "走进一条没走过的街，走到尽头为止",
    colors: ["#f0f4e8", "#7fb069", "#e8f0d8"],
    illustration_keyword: "urban_wanderer",
    story: "TA 厌倦了被算法推着走的日子。今天不查攻略、不开导航，把自己丢回街道里——城市还是有野生的角落的，只是太久没去找了。",
    catchphrase: "算法不知道我今天往哪走。",
    soundtrack: "重塑雕像的权利 / 万能青年旅店",
    best_time: "上午出门，走到太阳落山",
    companion: "一个人或一只听话的狗",
    avoid: "别打开点评 App，别为了拍照绕路",
    gift_from_city: "一条你从此会记很久的小巷子名字",
    keywords: ["徒步", "随机", "野生", "脱网", "城市"],
    routes: [
      "随便上一辆没坐过的公交，到终点站再说",
      "钻进一片老城区，迷路两小时也无所谓",
      "去一座山或江边，走到脚酸为止",
    ],
  },
  {
    id: "card_005",
    rarity: "SR",
    identity: "今天决定先把自己当回事的人",
    mood: "有点脆弱，但想被温柔对待",
    mission: "给自己买一样平时舍不得买的东西",
    colors: ["#fce4ec", "#f48fb1", "#fdf0f5"],
    illustration_keyword: "self_treat",
    story: "最近被生活推搡得有点累。今天 TA 决定先把自己当回事——不为谁，只为提醒自己：值得被认真对待的人，首先是自己。",
    catchphrase: "今天我请我自己。",
    soundtrack: "陈绮贞《旅行的意义》/ Adele 任意一首",
    best_time: "下午 3 点到夜里 10 点，慢慢花一天",
    companion: "一个人，今天屏蔽所有打扰",
    avoid: "别翻让自己难受的旧消息、别比惨",
    gift_from_city: "一阵恰好把心事吹散的风",
    keywords: ["疗愈", "宠自己", "重启", "仪式感", "独处"],
    routes: [
      "走进一家平时只敢看橱窗的店，买点什么",
      "做一次按摩或 SPA，让别人替你温柔一下自己",
      "一个人去吃一顿好的，点一杯酒",
    ],
  },
  {
    id: "card_006",
    rarity: "SSR",
    identity: "某个平行宇宙里选择留在这座城市的你",
    mood: "带着遗憾，也带着释然",
    mission: "去一个「如果当初留下来会常去」的地方",
    colors: ["#e8eaf6", "#9fa8da", "#ede7f6"],
    illustration_keyword: "parallel_self",
    story: "如果当年没走，今天的 TA 会是什么样？这座城市会替 TA 准备好哪条街、哪扇窗、哪间常去的店？今天，就替那个版本的自己活一天看看。",
    catchphrase: "我替另一个我，过一天。",
    soundtrack: "陈奕迅《孤独患者》/ 雷光夏《看不见的城市》",
    best_time: "黄昏开始，一直到夜色降下来",
    companion: "独自，最适合一个人和另一个自己对话",
    avoid: "别比较「现在」和「如果」的得失",
    gift_from_city: "一扇你从没推开过的窗里漏出的光",
    keywords: ["平行", "如果", "怀旧", "黄昏", "城市哲学"],
    routes: [
      "去一个你曾经差点搬过去的街区，转一下午",
      "找一家本地人推荐的家常菜馆，慢慢吃完",
      "在城市的高处坐一会儿，看夕阳落下去",
    ],
  },
  {
    id: "card_007",
    rarity: "R",
    identity: "把今天当作最后一个周末的人",
    mood: "珍惜，有点感性",
    mission: "拍下三张「值得被记住」的画面",
    colors: ["#fff8e1", "#ffcc80", "#fff3e0"],
    illustration_keyword: "last_weekend",
    story: "如果今天是最后一个能这样过的周末——TA 不想错过任何一束光、任何一阵风。镜头是借口，认真看世界才是目的。",
    catchphrase: "把今天活成可以回头看的那种。",
    soundtrack: "宇多田ヒカル《First Love》/ The Cinematic Orchestra",
    best_time: "从清晨到日落，赚一个完整的白天",
    companion: "独自或带最重要的那个人",
    avoid: "别一直盯着屏幕看相机里的画面",
    gift_from_city: "一束斜进窗户、刚好打在脸上的光",
    keywords: ["珍惜", "记忆", "摄影", "黄昏", "感性"],
    routes: [
      "回到你最早爱上这座城市的地方再走一遍",
      "拍一组陌生人的背影，作为「今天存在过」的证据",
      "去一家老地方，点你十年前就常点的那一样",
    ],
  },
  {
    id: "card_008",
    rarity: "N",
    identity: "想假装自己是本地人的外地人",
    mood: "好奇，有点紧张",
    mission: "去一家没有英文菜单的小馆子吃饭",
    colors: ["#e0f2f1", "#80cbc4", "#e8f5e9"],
    illustration_keyword: "local_pretender",
    story: "TA 不想再被认成游客了。今天 TA 要走进一家本地人才知道的小馆子，假装很熟地点上一份招牌——哪怕语言磕磕巴巴，也想试试这座城市真正的味道。",
    catchphrase: "今天不当游客，当熟客。",
    soundtrack: "本地电台 FM / 街头老歌串烧",
    best_time: "饭点准时去，最好是 11:30 或 18:00",
    companion: "一两个人最佳，不要拖大部队",
    avoid: "别拍菜、别说太多普通话以外的口音",
    gift_from_city: "老板一句「你也常来啊」的错觉",
    keywords: ["本地", "市井", "苍蝇馆子", "方言", "味道"],
    routes: [
      "去菜市场里那家排队的小档口，随大流点一份",
      "拐进巷子深处的家常店，听老板讲两句",
      "找一条本地人遛弯的路线，跟着走一圈",
    ],
  },
  {
    id: "card_009",
    rarity: "R",
    identity: "想被熟人包围、笑得大声一点的人",
    mood: "今天不想一个人",
    mission: "约一个许久没见的人，吃顿饭再散散步",
    colors: ["#ffe0d6", "#ffb38a", "#fff1ea"],
    illustration_keyword: "reunion",
    story: "TA 突然意识到：上次和熟人面对面笑出眼泪，已经是好几个月前的事了。今天不想再让聊天框代替见面，TA 想要真实的拥抱和真实的菜。",
    catchphrase: "聊天框不算见面。",
    soundtrack: "五月天《知足》/ 任贤齐《对面的女孩看过来》",
    best_time: "傍晚到深夜，吃饭聊到打烊",
    companion: "1-3 个老熟人，越久没见越好",
    avoid: "别看手机、别在工作群里聊正事",
    gift_from_city: "一张笑到模糊的合照",
    keywords: ["重逢", "饭局", "热闹", "夜晚", "聊天"],
    routes: [
      "约一顿火锅或烧烤，吃到油亮亮地走出来",
      "去一个有院子或屋顶的小馆，聊到打烊",
      "拉上对方去玩点幼稚的：桌游、KTV、夹娃娃",
    ],
  },
  {
    id: "card_010",
    rarity: "SR",
    identity: "想钻进旧时光里的人",
    mood: "想被慢一点的东西包住",
    mission: "找一家旧唱片店或老书店，待到天黑",
    colors: ["#dfe7f3", "#4f6d99", "#f3d8a8"],
    illustration_keyword: "vintage_seeker",
    story: "TA 受够了滑不到底的信息流，受够了什么都更新得太快。今天 TA 想躲进一段慢的时间里，最好有黑胶在转、有书页的味道、有店主不太说话的善意。",
    catchphrase: "把时间调慢一档。",
    soundtrack: "邓丽君 / Chet Baker《My Funny Valentine》",
    best_time: "下午 2 点进去，出来天就黑了",
    companion: "一个人最合适，安静比同伴更重要",
    avoid: "别刷短视频、别开外放",
    gift_from_city: "一张你顺手买下的、不知道会不会听的黑胶",
    keywords: ["旧物", "唱片", "老书店", "慢", "怀旧"],
    routes: [
      "钻进一家旧唱片店，让店主放一张你没听过的专辑",
      "去一家老书店，按封面挑一本带走",
      "找一家开了二十年以上的老咖啡馆，坐到打烊",
    ],
  },
  {
    id: "card_017",
    rarity: "SR",
    identity: "下班后偷一小时给自己的人",
    mood: "累，但还不想立刻回家",
    mission: "在公司一公里内找一个能喘口气的角落",
    colors: ["#2d3748", "#ed8936", "#fbd38d"],
    illustration_keyword: "after_work_escape",
    story: "工位的电脑刚关，TA 还没准备好回家。地铁口的人潮太挤，家里的沙发又太空。今天就给自己一小时——不刷工作群、不接电话，只是在城市某个角落，看着夕阳把楼染成橘色。",
    catchphrase: "下班和到家之间，这一小时是我的。",
    soundtrack: "陈鸿宇《理想三旬》/ Lofi Hip Hop 下班版",
    best_time: "下班后 18:30 - 20:00，夕阳到夜灯切换的时段",
    companion: "独自，这一小时谁都别来打扰",
    avoid: "别回工作群、别打开 KPI 文档",
    gift_from_city: "把楼缝里的夕阳认真看完一次",
    keywords: ["下班", "解压", "夕阳", "独处", "工作日"],
    routes: [
      "去公司附近的天台或江边，坐到天黑",
      "找一家便利店买杯啤酒，在路边的台阶上喝完",
      "随便走一段平时坐车经过的路，用脚重新认识它",
    ],
  },
  {
    id: "card_018",
    rarity: "R",
    identity: "在陌生城市只有半天空档的人",
    mood: "时间紧，但贪心想多体验一点",
    mission: "在 4 小时内抓到这座城市的「一个味道」",
    colors: ["#f6ad55", "#4299e1", "#fef5e7"],
    illustration_keyword: "short_stay",
    story: "出差也好、转机也好，在陌生城市只剩半天。TA 不想瘫在酒店刷手机——既然来了，就该让脚踩过几条真的街，让嘴尝过几口真的味道，哪怕只有四个小时。",
    catchphrase: "来都来了，总得带点什么回去。",
    soundtrack: "本地电台 / 旅行类播客",
    best_time: "中午 12 点到下午 5 点，赶在天黑回酒店",
    companion: "独自，效率最高",
    avoid: "别去机场免税店、别只在酒店周边转",
    gift_from_city: "一张回程飞机上还能想起来的味道",
    keywords: ["短停留", "陌生城市", "本地味", "高效", "出差"],
    routes: [
      "打车直奔老城区，只逛一个最有代表性的街区",
      "找一家本地排队的小馆子，吃一份招牌",
      "去一个能俯瞰城市的地方，站 10 分钟再走",
    ],
  },
  {
    id: "card_019",
    rarity: "N",
    identity: "雨天宅不住的人",
    mood: "被雨困着，但不想认输",
    mission: "找一个被雨声衬得更暖的室内角落",
    colors: ["#90cdf4", "#d69e2e", "#edf2f7"],
    illustration_keyword: "rainy_day_indoor",
    story: "原本约好的事被雨黄了，但 TA 还是出了门。雨天的城市有另一种节奏——湿漉漉的街、模糊的车灯、玻璃上的水痕，都在邀请 TA 走进某个温暖的窗后。",
    catchphrase: "雨天也算出门，只要心是干的。",
    soundtrack: "雨声白噪音 / 久石让《Summer》",
    best_time: "全天皆可，雨最大的时候最有氛围",
    companion: "一个人或带一本读到一半的书",
    avoid: "别穿不防水的鞋、别看天气预报骂街",
    gift_from_city: "一杯雨天专属、温度刚好的热饮",
    keywords: ["雨天", "室内", "咖啡馆", "窗边", "白噪音"],
    routes: [
      "找一家窗边位的咖啡馆，看雨打玻璃看半天",
      "钻进一座美术馆或博物馆，把雨等到停",
      "去一家有檐廊的旧书店，听雨声翻书页",
    ],
  },
  {
    id: "card_021",
    rarity: "R",
    identity: "深夜睡不着、想出门走一段的人",
    mood: "脑子停不下来，身体却想被夜风冷一下",
    mission: "在 0 点之后，走完一段平时白天走的路",
    colors: ["#1a202c", "#4c51bf", "#f6ad55"],
    illustration_keyword: "late_night_walker",
    story: "翻来覆去到凌晨，心里有事说不清。TA 决定起来出门——空街、路灯、便利店的冷柜光，这些只有深夜才肯出现的东西，能比任何 App 都更快把人冷静下来。",
    catchphrase: "睡不着的夜，城市替我清醒。",
    soundtrack: "万能青年旅店《十万嬉皮》/ Bon Iver《Holocene》",
    best_time: "凌晨 0 点到 3 点，最安静的那段",
    companion: "独自，深夜的城市只能一个人享受",
    avoid: "别去人多的酒吧、别打电话给前任",
    gift_from_city: "便利店店员一句平静的「您好」",
    keywords: ["深夜", "失眠", "散步", "便利店", "清醒"],
    routes: [
      "走一段平时通勤的路，看它在夜里另一副样子",
      "去 24 小时便利店买一份关东煮，坐窗边吃完",
      "找一处有水的地方——河边、湖边，听水声 20 分钟",
    ],
  },
  {
    id: "card_022",
    rarity: "R",
    identity: "想流一身汗的人",
    mood: "憋得慌，想用身体把脑子放空",
    mission: "用脚或轮子，在城市里画一条属于今天的轨迹",
    colors: ["#f56565", "#38b2ac", "#fef5e7"],
    illustration_keyword: "city_runner",
    story: "情绪在身体里堵着出不来。TA 决定不用嘴讲、不用文字写，就用一身汗把它换出去——心跳到耳朵嗡嗡响的时候，世界反而清静了。",
    catchphrase: "汗一出，事就小了。",
    soundtrack: "高强度跑步歌单 / The Chemical Brothers",
    best_time: "清晨 6 点或傍晚 6 点，温度最舒服",
    companion: "独自 / 一个跑友 / 一辆共享单车",
    avoid: "别空腹、别在最热的正午硬撑",
    gift_from_city: "结束时一杯结冰水的爽快",
    keywords: ["运动", "跑步", "骑行", "出汗", "解压"],
    routes: [
      "沿江边或环城绿道跑 5 公里，中途不停",
      "骑共享单车从城东骑到城西，记下沿途三家想再来的店",
      "找一段长台阶或一座小山，爬到喘不上气",
    ],
  },
  {
    id: "card_023",
    rarity: "SR",
    identity: "想给自己充点灵感电的人",
    mood: "枯了，需要新的东西灌进脑子",
    mission: "带一本本子出门，记下三个让你心动的细节",
    colors: ["#d6bcfa", "#fefcbf", "#fed7aa"],
    illustration_keyword: "creative_inspiration",
    story: "对着空白文档/画板坐了一整天，什么都挤不出来。TA 决定换一种方式喂自己——不是搜 Pinterest、不是刷 ins，而是真的走进世界里，看光、看人、看一个没见过的颜色组合。",
    catchphrase: "灵感不在屏幕里，在街角里。",
    soundtrack: "Nils Frahm / 久石让钢琴版",
    best_time: "下午 2 点到傍晚 7 点，光线最有故事感",
    companion: "独自，带一本本子和一支笔",
    avoid: "别带相机当任务、别给自己设产出目标",
    gift_from_city: "一种你叫不出名字、但想画下来的颜色",
    keywords: ["灵感", "采风", "美术馆", "速写", "观察"],
    routes: [
      "去一家正在展的美术馆，只挑三件作品认真看",
      "找一条有老建筑的街，坐在台阶上画 / 写 20 分钟",
      "进一家买手店或独立书店，看陈列如何讲故事",
    ],
  },
];

export const PERSONA_CARDS: PersonaCard[] = _PERSONA_CARDS_BASE.map((c) => ({
  ...c,
  cover: COVERS[c.id],
}));

// 抽卡权重（百分比，合计 100）

const RARITY_WEIGHTS: Record<Rarity, number> = {
  N: 50,
  R: 30,
  SR: 15,
  SSR: 5,
};


export function drawCard(exclude?: string): PersonaCard {
  // 按稀有度先抽稀有度，再从该稀有度内随机一张
  const roll = Math.random() * 100;
  let acc = 0;
  let chosen: Rarity = "N";
  for (const r of ["N", "R", "SR", "SSR"] as Rarity[]) {
    acc += RARITY_WEIGHTS[r];
    if (roll < acc) { chosen = r; break; }
  }
  let pool = PERSONA_CARDS.filter((c) => c.rarity === chosen);
  if (exclude) pool = pool.filter((c) => c.id !== exclude);
  if (pool.length === 0) pool = PERSONA_CARDS.filter((c) => c.rarity === chosen);
  return pool[Math.floor(Math.random() * pool.length)];
}

export const RARITY_LABEL: Record<Rarity, string> = {
  N: "Normal",
  R: "Rare",
  SR: "Super Rare",
  SSR: "Super Super Rare",
};

// 通过卡片 id 取最新的封面（用于修复历史归档里旧 hash 路径失效的问题）
export function getCoverById(id?: string): string | undefined {
  if (!id) return undefined;
  return COVERS[id];
}

// 预加载所有人设卡封面（在首页/进入「我自己选」前调用，避免点开瞬时白屏）
let _coversPreloaded = false;
export function preloadAllCovers() {
  if (_coversPreloaded || typeof window === "undefined") return;
  _coversPreloaded = true;
  for (const url of Object.values(COVERS)) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}
