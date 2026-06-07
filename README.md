<div align="center">

# ✦ TodayPersona · 今日人设 ✦

<br/>

<a href="https://plan-a-pal-95.lovable.app/" target="_blank">
  <img src="https://img.shields.io/badge/✨_在线体验-plan--a--pal--95.lovable.app-0ea5e9?style=for-the-badge&labelColor=1e293b" alt="在线演示">
</a>

<br/>
<br/>

**你不一定知道今天想去哪、想干什么、想得到什么——但你一定知道自己此刻的感受，也知道心里那个一直想成为的自己。**

<br/>

*美团黑客松参赛作品*

<br/>

<img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white" alt="React">
<img src="https://img.shields.io/badge/TanStack-Start-f59e0b?style=flat-square" alt="TanStack">
<img src="https://img.shields.io/badge/LangGraph-js-1e3a8a?style=flat-square" alt="LangGraph">
<img src="https://img.shields.io/badge/Supabase-Edge%20Functions-3ecf8e?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">

</div>

<p align="center">
  <a href="#-故事开始">故事开始</a> •
  <a href="#-核心功能">核心功能</a> •
  <a href="#-技术架构">技术架构</a> •
  <a href="#-本地开发">本地开发</a> •
  <a href="#-项目结构">项目结构</a>
</p>

---

## 📖 简介

你不一定知道今天想去哪、想干什么、想得到什么——但你一定知道自己此刻的感受，也知道心里那个一直想成为的自己。

问题从来不是没有选择，而是没有人懂你。

「今日人设 · TodayPersona」从这里出发。它不只是一个推荐工具，更是一本需要你来翻开的故事书。你只需要抽一张人设卡，或者直接告诉我此刻的你是谁、今天想成为谁——TodayPersona 来倾听，根据你的城市、时段和情绪，把路线安排好，团购下好、预约订好，你只需要出门。

走完之后，记录下此刻的感受，TodayPersona 也会帮你记录——把每一次出行整理成一份专属于你的连载书。可收藏，可分享，翻回来看，那是某一天真实活过的你。

今天，你想成为谁？

[📖 产品说明书](https://my.feishu.cn/wiki/XxEYwGLDlicUWyklARmcuTJKnge?from=from_copylink)

---

## ✨ 核心功能

### 🃏 人设卡系统

10 张精心设计的人设卡，每张都是一种「活在今天的方式」：

| 稀有度 | 身份示例 |
|--------|----------|
| **SSR** | 刚从长期隐居中回归人间的人 / 某个平行宇宙里选择留在这座城市的你 |
| **SR** | 在异乡漂泊的植物学家 / 刚失恋三天决定重新爱上生活的人 |
| **R** | 在城市里寻找野生感的人 / 想被朋友包围的人 |
| **N** | 喜欢在家的人今天破例出门 / 想假装自己是本地人的外地人 |

**三种抽取模式：**
- 🤖 **AI 帮我挑** — 通过情绪、时长、氛围等引导对话，零负担完成人设匹配
- 📋 **我自己选** — 浏览全部卡牌，选择心动的那张
- 🔮 **让命运决定** — 塔罗式随机抽取

### 🤖 AI 旅程生成

双 Agent 协作，LangGraph 编排：

```
START
  │
  ├── fetch_profile (并行)     → 获取你的偏好画像
  └── resolve_location (并行)  → 坐标转换 (WGS84→GCJ02)
        │
        ▼
    plan_pois (Agent 1)        → POI 规划师：分析人设，搜索地点
        │
        ▼
    validate_pois              → 验证候选数量与类型
        │
        ▼
    generate_journey (Agent 2) → 故事生成师：编织叙事路线
        │
        ▼
       END
```

**输出内容：**
- 📖 故事开篇（30-50字）
- 🎭 3-4 个场景（诗意命名 + 人设视角叙事 + 具体行动）
- 💫 情绪弧线（起始情绪 → 结束情绪）
- 🌙 故事结语（60-100字）

### 🗺️ 交互式旅程地图

- **手绘风 SVG 地图** — 原创设计，每个地点带专属插画与互动热点
- **场景交互** — 叙事、任务、导航、美团入口一应俱全
- **打卡系统** — 支持照片、心情标签、随笔记录
- **进度追踪** — 完成所有场景后解锁故事终章

### 📚 连载存档系统

所有旅程自动整理为三种视图：

| 视图 | 内容 |
|------|------|
| **连载小说** | 按时间线串联的叙事文本 |
| **漫画分镜** | 视觉化的卡片式展示 |
| **收藏馆** | 去过的地方、做过的事 |

支持 **PDF 导出** 与 **社交分享**。

### 🧠 用户画像学习

系统会记住你的偏好：
- ❤️ 喜爱的标签
- 👎 不喜欢的标签
- 📍 访问过的 POI

下次生成旅程时，AI 会参考这些信息，让推荐更懂你。

---

## 🏗️ 技术架构

### 技术栈

| 层级 | 技术选型 |
|------|----------|
| **前端框架** | [TanStack Start](https://tanstack.com/start) + React 19 + Vite 7 |
| **样式系统** | Tailwind CSS v4 + 自定义设计系统 |
| **后端服务** | Supabase Edge Functions (Deno runtime) |
| **AI 引擎** | [LangChain.js](https://js.langchain.com/) + [LangGraph](https://langchain-ai.github.io/langgraphjs/) |
| **数据库** | PostgreSQL (Supabase) |
| **地图服务** | 高德地图 API |
| **状态管理** | TanStack Query + React Router |
| **UI 组件** | shadcn/ui (Radix primitives) |

### LangGraph Agent 架构

项目采用 LangGraph 构建多 Agent 协作系统：

**Agent 1: POI 规划师**
- 框架：`createReactAgent` (ReAct 模式)
- 工具：高德 POI 搜索、用户画像获取、坐标转换
- 特点：批量关键词搜索，减少 LLM 循环次数

**Agent 2: 故事生成师**
- 框架：纯 LLM + 结构化输出
- 工具：无（输入由 Agent 1 准备）
- 特点：创意型任务，温度 0.7

### 数据库设计

```sql
-- Quest 执行历史
CREATE TABLE quest_history (
  id UUID PRIMARY KEY,
  player_key TEXT,
  character_class TEXT,
  emotion TEXT,
  city TEXT,
  quest JSONB,
  stages_unlocked INT,
  rating INT,
  liked_stage_orders INT[]
);

-- 用户偏好画像
CREATE TABLE dm_memory (
  player_key TEXT PRIMARY KEY,
  profile TEXT,
  loved_tags TEXT[],
  disliked_tags TEXT[],
  visited_pois TEXT[],
  total_runs INT
);

-- 旅程存档
CREATE TABLE saga_archive (
  chapter_id TEXT PRIMARY KEY,
  chapter JSONB,
  card_identity TEXT,
  city TEXT,
  completed_count INT
);
```

---

## 🚀 本地开发

### 环境要求

- Node.js 18+
- Bun (推荐) 或 npm
- Supabase CLI (可选，用于本地 Supabase)

### 安装依赖

```bash
bun install
```

### 配置环境变量

创建 `.env` 文件：

```env
# ===== LLM 配置 =====
LLM_PROVIDER="openai"                          # 或 "lovable"
OPENAI_API_KEY="sk-..."                        # 你的 API Key
OPENAI_MODEL="qwen3.6-flash"                   # 模型名称
OPENAI_BASE_URL="https://api.openai.com/v1"   # API 地址

# ===== Supabase (生产环境) =====
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJ..."
SUPABASE_SECRET_KEY="eyJhbGciOiJ..."
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJ..."
VITE_SUPABASE_PROJECT_ID="your-project-id"

# ===== Supabase (本地开发) =====
# SUPABASE_URL="http://127.0.0.1:54321"
# SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
# DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# ===== 高德地图 =====
AMAP_WEB_API_KEY="your-amap-key"
```

### 启动开发服务器

```bash
bun run dev
```

应用将在 `http://localhost:3000` 启动。

### 本地 Supabase (可选)

```bash
# 安装 Supabase CLI
npm install -g supabase

# 启动本地 Supabase
supabase start

# 应用数据库迁移
supabase db push
```

---

## 📁 项目结构

```
FairyWeekend/
├── src/                              # 前端源码
│   ├── routes/                       # 文件路由
│   │   ├── index.tsx                # 首页 - 抽卡
│   │   ├── card.tsx                 # 卡片详情
│   │   ├── journey.tsx              # 旅程地图
│   │   ├── finale.tsx               # 故事终章
│   │   ├── me.tsx                   # 我的连载
│   │   └── share.tsx                # 分享页面
│   │
│   ├── components/                   # React 组件
│   │   ├── ui/                      # shadcn/ui 组件库
│   │   ├── AgentChatView.tsx        # AI 对话界面
│   │   └── UserPhotoCard.tsx        # 照片卡片
│   │
│   ├── lib/                          # 核心业务逻辑
│   │   ├── cards.ts                 # 10张人设卡定义
│   │   ├── persona-types.ts         # TypeScript 类型
│   │   ├── persona-store.ts         # 状态管理 + 云同步
│   │   ├── export-pdf.ts            # PDF 导出
│   │   └── scene-deals.ts           # 美团优惠集成
│   │
│   ├── assets/persona/               # 卡面封面图 (10张)
│   └── styles.css                    # Tailwind + 自定义样式
│
├── supabase/
│   ├── functions/                    # Edge Functions (Deno)
│   │   ├── _shared/agent/           # LangGraph Agent 核心
│   │   │   ├── graph.ts             # 图编排
│   │   │   ├── state.ts             # 状态定义
│   │   │   ├── nodes.ts             # 节点函数
│   │   │   ├── agents/              # Agent 实现
│   │   │   │   ├── poi-planner.agent.ts
│   │   │   │   └── story-generator.agent.ts
│   │   │   └── tools/               # LangChain 工具
│   │   │       ├── search-poi.tool.ts
│   │   │       ├── get-player-profile.tool.ts
│   │   │       └── reverse-geocode.tool.ts
│   │   │
│   │   ├── generate-quest-agent/    # 主 API 入口
│   │   ├── record-quest/            # 记录 Quest 历史
│   │   └── resolve-location/        # 地理位置服务
│   │
│   └── migrations/                   # 数据库迁移
│
├── docs/                             # 设计文档
│   ├── 1. 任务背景.md                # 黑客松题目
│   ├── 2. 原始API说明.md             # API 规格
│   └── 3. Agent设计.md               # LangGraph 架构详解
│
└── tests/                            # 测试
    └── postchain.test.mjs
```

---

## 🎨 设计系统

项目采用自定义粉彩设计系统：

- **配色**：柔和的粉彩色调，每张卡牌有专属配色
- **字体**：中文衬线字体 + 英文 Display 字体
- **动效**：浮动花瓣、卡片翻转、场景切换
- **插画**：手绘风 SVG 地图与场景热点

---

## 📊 性能指标

| 阶段 | 预期耗时 |
|------|----------|
| fetch_profile | 100-300ms |
| resolve_location | 100-200ms |
| plan_pois (Agent 1) | 2-5s |
| validate_pois | <10ms |
| generate_journey (Agent 2) | 3-8s |
| **总计** | **5-15s** |

---

## 🛠️ 可用脚本

```bash
# 开发
bun run dev

# 构建
bun run build
bun run build:dev

# 预览生产构建
bun run preview

# 代码检查
bun run lint
bun run format

# 测试
bun run postchain:test
```

---

## 📝 项目背景

本作品为 **美团黑客松（Meituan Hackathon）** 参赛项目。

**题目**：本地探索 - 周末闲时活动规划

**核心挑战**：
- 接受一句自然语言目标
- 输出可执行的完整方案
- 自动完成关键下单/预订动作

**我们的解法**：
将「抽卡 × 叙事 × 地图 × 消费」串联，让活动规划变成一次有仪式感的角色扮演。

---

## 📄 License

MIT

---

<p align="center">
  <em>城市不记得你，但草记得。</em>
</p>
