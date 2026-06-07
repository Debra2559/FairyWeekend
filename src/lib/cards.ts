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
import cover011 from "@/assets/persona/card_011.webp";
import cover012 from "@/assets/persona/card_012.webp";
import cover013 from "@/assets/persona/card_013.webp";
import cover014 from "@/assets/persona/card_014.webp";
import cover015 from "@/assets/persona/card_015.webp";
import cover016 from "@/assets/persona/card_016.webp";

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
  card_011: cover011,
  card_012: cover012,
  card_013: cover013,
  card_014: cover014,
  card_015: cover015,
  card_016: cover016,
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
    identity: "刚失恋三天，决定重新爱上生活的人",
    mood: "脆弱但在修复",
    mission: "给自己买一样平时舍不得买的东西",
    colors: ["#fce4ec", "#f48fb1", "#fdf0f5"],
    illustration_keyword: "healing_soul",
    story: "眼泪流够了。今天 TA 决定先把自己当回事——不为谁，只为提醒自己：值得被认真对待的人，首先是自己。",
    catchphrase: "今天我请我自己。",
    soundtrack: "陈绮贞《旅行的意义》/ Adele 任意一首",
    best_time: "下午 3 点到夜里 10 点，慢慢花一天",
    companion: "一个人，全程不要回复任何前任的消息",
    avoid: "别翻旧照片、别走两人去过的路线",
    gift_from_city: "一阵恰好吹散眼泪的风",
    keywords: ["疗愈", "宠自己", "失恋", "重启", "仪式感"],
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
    identity: "想被朋友包围的人",
    mood: "今天不想一个人，想笑得大声一点",
    mission: "约一个许久没见的朋友，吃顿饭再散散步",
    colors: ["#ffe0d6", "#ffb38a", "#fff1ea"],
    illustration_keyword: "friends_gathering",
    story: "TA 突然意识到：上次和朋友面对面笑出眼泪，已经是好几个月前的事了。今天不想再让聊天框代替见面，TA 想要真实的拥抱和真实的菜。",
    catchphrase: "聊天框不算见面。",
    soundtrack: "五月天《知足》/ 任贤齐《对面的女孩看过来》",
    best_time: "傍晚到深夜，吃饭聊到打烊",
    companion: "1-3 个老朋友，越久没见越好",
    avoid: "别看手机、别工作群里聊正事",
    gift_from_city: "一张笑到模糊的合照",
    keywords: ["朋友", "饭局", "重逢", "热闹", "夜晚"],
    routes: [
      "约一顿火锅或烧烤，吃到油亮亮地走出来",
      "去一个有院子或屋顶的酒馆，聊到打烊",
      "拉上朋友去玩点幼稚的：桌游、KTV、夹娃娃",
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
    id: "card_011",
    rarity: "SR",
    identity: "热恋期想被全世界看见的人",
    mood: "心里有糖在化",
    mission: "和 ta 走一条只属于今天的路",
    colors: ["#ffe4ec", "#ffb3c6", "#fff0d6"],
    illustration_keyword: "sweet_couple_date",
    story: "TA 们正处在那种「你笑我就笑」的阶段。今天不为打卡热门，只想找一条没人打扰的小路，慢慢牵着手走完，再慢慢把这一天记进彼此的脑子里。",
    catchphrase: "我们今天就赢了一整座城。",
    soundtrack: "陶喆《爱很简单》/ 周深《大鱼》",
    best_time: "傍晚 5 点到夜里 10 点，灯一盏盏亮起来",
    companion: "和 ta · 二人世界",
    avoid: "别玩手机，别拍太多照片打断当下",
    gift_from_city: "一阵恰好把头发吹乱的晚风",
    keywords: ["热恋", "约会", "牵手", "甜", "心动"],
    routes: [
      "找一条没去过的老街，从街头走到街尾",
      "挑一家两个人都没吃过的小馆子，互相喂一口",
      "去一处能看见城市灯火的高处，坐到话说完为止",
    ],
  },
  {
    id: "card_012",
    rarity: "R",
    identity: "在一起很久的「老搭档」",
    mood: "安心、想偷得半日闲",
    mission: "做一件「年轻时一起做过」的小事",
    colors: ["#f5ecda", "#d8b89c", "#efe2c8"],
    illustration_keyword: "long_term_couple",
    story: "不用再证明什么了。今天 TA 们想找回那种「不用说话也很自在」的感觉——一杯热茶、一段熟悉的路、一句旧梗，比任何浪漫都值。",
    catchphrase: "不用浪漫，因为我们就是。",
    soundtrack: "李宗盛《山丘》/ 张国荣《当年情》",
    best_time: "下午到傍晚，时间慢慢漏掉",
    companion: "和 ta · 二人世界（老搭档版）",
    avoid: "别赶时间、别争论小事",
    gift_from_city: "一家还在的老店、一份没变味的旧菜",
    keywords: ["长期关系", "陪伴", "复刻", "慢", "默契"],
    routes: [
      "回到 TA 们第一次约会的那条街/那家店",
      "找一家有院子的茶馆，下一盘很慢的棋",
      "买一束家用的小花回家插上，结束这一天",
    ],
  },
  {
    id: "card_013",
    rarity: "SR",
    identity: "暧昧期、第一次单独出来的两个人",
    mood: "紧张、雀跃、想多看 ta 一眼",
    mission: "找一个能聊到忘记看时间的角落",
    colors: ["#fff5ee", "#ffd4c2", "#ffe9d6"],
    illustration_keyword: "first_date_spark",
    story: "可能是聊了很久才约出来的人，可能是刚认识没多久。今天的关键不是去哪儿，而是有没有那一瞬间——眼神撞上，心跳漏了一拍。",
    catchphrase: "别尴尬，让灯光替我们说话。",
    soundtrack: "告五人《爱人错过》/ Taylor Swift《Lover》",
    best_time: "傍晚 6 点起，最适合从下午茶聊到夜宵",
    companion: "和 ta · 二人世界（初次版）",
    avoid: "别选太吵的餐厅、别一上来就吃辛辣大餐",
    gift_from_city: "一个聊到打烊都没注意到的小角落",
    keywords: ["暧昧", "初次", "心动", "灯光", "餐厅"],
    routes: [
      "约在有窗边位的精致咖啡馆，聊到天色变了",
      "去一家氛围感强、又不吵的小酒馆喝一杯",
      "饭后随便挑一条街，再走一段「不舍得回家」的路",
    ],
  },
  {
    id: "card_014",
    rarity: "R",
    identity: "今天把全家都带出门的家长",
    mood: "有点累，但被笑声治愈着",
    mission: "找一个让小孩和大人都能玩开的地方",
    colors: ["#fff8d6", "#cfe3a8", "#ffe0a8"],
    illustration_keyword: "family_day_out",
    story: "一周里难得的空闲，TA 决定把家人都拉出门。不为多高级的体验，就想要那种「全家人都在一张照片里笑得很傻」的画面。",
    catchphrase: "今天，全家都在 frame 里。",
    soundtrack: "宫崎骏配乐串烧 / 周杰伦《听妈妈的话》",
    best_time: "上午 10 点出门，下午 5 点前撤回",
    companion: "全家 · 家庭日",
    avoid: "别排长队、别去太精致不能撒野的地方",
    gift_from_city: "一张全家人都在笑的合照",
    keywords: ["家庭", "亲子", "公园", "野餐", "笑声"],
    routes: [
      "去一座大公园野餐，带上飞盘和泡泡机",
      "找一家可以让小孩跑跳的亲子餐厅吃顿正经的",
      "傍晚去江边/海边走一段，看夕阳收尾",
    ],
  },
  {
    id: "card_015",
    rarity: "N",
    identity: "想喊上闺蜜大聊一下午的人",
    mood: "想笑、想八卦、想被理解",
    mission: "和姐妹找一家拍得好看的店，从下午坐到天黑",
    colors: ["#f3e8ff", "#e0c3f5", "#fff0f6"],
    illustration_keyword: "girls_afternoon",
    story: "最近发生了太多想说的事，工作群里没法讲、男朋友也讲不通——只有姐妹懂。今天就是要面对面，从奶茶喝到火锅，把上半年的瓜补完。",
    catchphrase: "这事，只能和你说。",
    soundtrack: "孙燕姿《我怀念的》/ 莫文蔚《盛夏的果实》",
    best_time: "下午 2 点开始，一路聊到深夜",
    companion: "1-3 个姐妹 · 朋友局",
    avoid: "别带男朋友、别去太安静的图书馆类场所",
    gift_from_city: "一个比男朋友更懂你的瞬间",
    keywords: ["姐妹", "下午茶", "八卦", "拍照", "甜品"],
    routes: [
      "约一家颜值在线的下午茶店，拍照拍到没电",
      "去一家粉色 / 花艺主题的小店逛着聊",
      "晚上转战火锅或者甜品店，把没说完的接着说",
    ],
  },
  {
    id: "card_016",
    rarity: "SR",
    identity: "想叫上兄弟撸串喝一杯的人",
    mood: "想吼、想放空、想笑到呛酒",
    mission: "找一家有烟火气的小馆子，喝到话变多",
    colors: ["#2f3e46", "#f4a261", "#e9c46a"],
    illustration_keyword: "bros_night_out",
    story: "工作上的事憋了一周。今天 TA 想约几个最铁的兄弟，找个有烟火气的地儿，一边撸串一边把那些不能发朋友圈的话都讲出来。",
    catchphrase: "啤酒满上，话就来了。",
    soundtrack: "朴树《平凡之路》/ 痛仰乐队《再见杰克》",
    best_time: "晚上 7 点开桌，凌晨 12 点散场",
    companion: "2-4 个兄弟 · 朋友局",
    avoid: "别带工作搭子、别 AA 算太细",
    gift_from_city: "一段第二天醒来还在嘴角的笑话",
    keywords: ["兄弟", "撸串", "夜宵", "啤酒", "解压"],
    routes: [
      "找一家烟雾缭绕的烧烤摊，先点 50 串再说",
      "转场到小酒馆，开一打啤酒慢慢聊",
      "夜骑或者夜走一段，把酒气吹散再各回各家",
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
