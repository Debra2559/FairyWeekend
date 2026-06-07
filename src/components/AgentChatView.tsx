import { useEffect, useMemo, useRef, useState } from "react";
import { PERSONA_CARDS, RARITY_LABEL } from "@/lib/cards";
import type { PersonaCard } from "@/lib/persona-types";
import { pickEmoji } from "@/lib/text-emoji";

type Step = "mood" | "duration" | "vibe" | "transport" | "extra" | "result";

const TRANSPORT_CHIPS = [
  { label: "步行 🚶", tag: "步行" },
  { label: "骑行 🚲", tag: "骑行" },
  { label: "地铁/公交 🚇", tag: "公交" },
  { label: "打车 🚖", tag: "打车" },
  { label: "自驾 🚗", tag: "自驾" },
  { label: "都行，看推荐 ✦", tag: "" },
];

const TRANSPORT_TAGS = new Set(["步行", "骑行", "公交", "打车", "自驾"]);

const MOOD_CHIPS = [
  { label: "想被治愈 🌿", tag: "治愈" },
  { label: "想冒险 🔥", tag: "冒险" },
  { label: "有点累 🥱", tag: "疲惫" },
  { label: "好奇心爆棚 ✨", tag: "好奇" },
  { label: "想独处 🌙", tag: "独处" },
  { label: "想热闹 🎈", tag: "热闹" },
  { label: "有点感伤 🥀", tag: "感伤" },
  { label: "想发呆 ☁️", tag: "放空" },
  { label: "心情有点闷 🌧", tag: "低气压" },
  { label: "想撒野 🏃", tag: "释放" },
  { label: "想找灵感 🎨", tag: "灵感" },
  { label: "想被宠一下 🍰", tag: "宠爱" },
  { label: "想运动出汗 💦", tag: "运动" },
  { label: "想恋爱感 💌", tag: "心动" },
];
const DURATION_CHIPS = [
  { label: "1 小时左右", tag: "短时" },
  { label: "2–3 小时", tag: "" },
  { label: "半天", tag: "长时" },
  { label: "一整天", tag: "长时" },
  { label: "只是想出门走走", tag: "随性" },
  { label: "晚饭后那段时间", tag: "夜晚" },
];
const VIBE_CHIPS = [
  { label: "安静的角落", tag: "安静" },
  { label: "烟火气", tag: "热闹" },
  { label: "自然/绿意", tag: "自然" },
  { label: "复古/旧时光", tag: "复古" },
  { label: "文艺/书香", tag: "文艺" },
  { label: "市井小巷", tag: "市井" },
  { label: "城市天际线", tag: "都市" },
  { label: "水边/江河湖海", tag: "水边" },
  { label: "屋顶/高处", tag: "高处" },
  { label: "夜色微醺", tag: "夜晚" },
  { label: "咖啡香", tag: "咖啡" },
  { label: "甜品时刻", tag: "甜品" },
  { label: "小众/有意思", tag: "小众" },
  { label: "运动出汗", tag: "运动" },
  { label: "随便都好", tag: "随性" },
];

interface ChatMsg {
  id: number;
  who: "agent" | "user";
  text?: string;
  chips?: { label: string; tag: string; submit?: boolean }[];
  step?: Step;
  freeInput?: boolean;
  multi?: boolean;
  card?: PersonaCard;
}

export function AgentChatView({ onAccept }: { onAccept: (c: PersonaCard) => void }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [recIdx, setRecIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const voiceSessionRef = useRef<VoiceSession | null>(null);
  const ranking = useRef<PersonaCard[]>([]);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const voiceSupported = typeof window !== "undefined" && isVoiceSupported();

  function toggleVoice() {
    if (!voiceSupported) {
      setVoiceError("当前浏览器不支持语音输入");
      return;
    }
    if (listening) {
      voiceSessionRef.current?.stop();
      voiceSessionRef.current = null;
      setListening(false);
      return;
    }
    setVoiceError(null);
    const session = startVoiceSession({
      initialText: input,
      onText: (text) => setInput(text),
      onError: (code) => {
        setVoiceError(code === "not-allowed" ? "麦克风权限被拒绝" : "语音识别失败");
      },
      onEnd: () => {
        voiceSessionRef.current = null;
        setListening(false);
      },
    });
    if (!session) {
      setVoiceError("无法开启语音输入");
      return;
    }
    voiceSessionRef.current = session;
    setListening(true);
  }


  const nextId = () => ++idRef.current;

  function push(msg: Omit<ChatMsg, "id">, delay = 200) {
    if (delay <= 0) {
      setMsgs((m) => [...m, { id: nextId(), ...msg }]);
      return;
    }
    setTyping(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { id: nextId(), ...msg }]);
      setTyping(false);
    }, delay);
  }

  // 初始化（用 ref 守卫，避免 StrictMode 双触发）
  const initedRef = useRef(false);
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    // 首屏立即给出全部初始内容，不让用户等
    push({ who: "agent", text: "嗨，我是今日小说的策划助理 ❦" }, 0);
    push({ who: "agent", text: "这个周末，你想过成什么样？随便讲就行——\n· 此刻的状态（累瘫了 / 有点闷 / 想撒野…）\n· 想待在什么环境（窝在房间 / 想出门晒太阳 / 找个安静角落…）\n· 想和谁、做点什么、或者只是想被什么样的氛围包住\n\n想到哪说到哪，下面也可以点气泡让我一步步带你选。" }, 0);
    push({ who: "agent", text: "要不先从这个开始：你现在大概是什么状态？" }, 0);
    push({ who: "agent", chips: MOOD_CHIPS, step: "mood", freeInput: true }, 0);
  }, []);

  // 自动滚到底
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  function handleChip(step: Step, label: string, tag: string, submit?: boolean) {
    // 如果是提交类型的气泡，直接提交
    if (submit) {
      setMsgs((m) =>
        m.map((x) =>
          x.step === step && x.chips ? { ...x, chips: undefined, freeInput: false } : x,
        ),
      );
      setMsgs((m) => [...m, { id: nextId(), who: "user", text: label }]);
      advance(step, tags, freeText);
      return;
    }
    // 否则追加到输入框（已有内容则用空格分隔）
    setInput((prev) => (prev ? `${prev} ${label}` : label));
    // 记录 tag（用于推荐匹配）
    if (tag) setTags((prev) => [...prev, tag]);
    // 不隐藏 chips，不提交，让用户继续选或编辑
  }

  function handleMultiSubmit(step: Step, chips: { label: string; tag: string }[]) {
    if (picked.length === 0) return;
    const chosen = picked.map((i) => chips[i]);
    const label = chosen.map((c) => c.label).join("、");
    const addTags = chosen.map((c) => c.tag).filter(Boolean);
    setMsgs((m) =>
      m.map((x) =>
        x.step === step && x.chips ? { ...x, chips: undefined, freeInput: false, multi: false } : x,
      ),
    );
    setMsgs((m) => [...m, { id: nextId(), who: "user", text: label }]);
    const newTags = [...tags, ...addTags];
    setTags(newTags);
    setPicked([]);
    advance(step, newTags, freeText);
  }

  function stopVoice() {
    voiceSessionRef.current?.stop();
    voiceSessionRef.current = null;
    setListening(false);
  }

  async function checkIntentComplete(text: string, currentStep: Step): Promise<{
    isComplete: boolean;
    extractedInfo: Record<string, string>;
    reply: string;
  }> {
    try {
      const res = await fetch("/api/public/understand-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, currentStep }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      return {
        isComplete: data.isCompleteIntent || false,
        extractedInfo: data.extractedInfo || {},
        reply: data.replyIfComplete || "",
      };
    } catch {
      return { isComplete: false, extractedInfo: {}, reply: "" };
    }
  }

  async function handleFreeSubmit(currentStep: Step) {
    const text = input.trim();
    if (!text) return;
    stopVoice();
    setInput("");
    // 防止异步 onresult 在清空之后又把文本写回来
    setTimeout(() => setInput(""), 0);
    setPicked([]);
    setMsgs((m) =>
      m.map((x) =>
        x.step === currentStep && x.chips ? { ...x, chips: undefined, freeInput: false } : x,
      ),
    );
    setMsgs((m) => [...m, { id: nextId(), who: "user", text }]);
    const combined = freeText ? `${freeText} ${text}` : text;
    setFreeText(combined);

    // 检查用户意图是否已经完整
    const intent = await checkIntentComplete(combined, currentStep);

    if (intent.isComplete) {
      // 意图完整，直接推荐
      if (intent.reply) {
        push({ who: "agent", text: intent.reply }, 200);
      }
      // 将提取的信息作为 tags
      const extractedTags = Object.values(intent.extractedInfo).filter(Boolean);
      if (extractedTags.length > 0) {
        setTags((prev) => [...prev, ...extractedTags]);
      }
      finalize([...tags, ...extractedTags], combined, true);
    } else {
      // 意图不完整，继续问答流程
      advance(currentStep, tags, combined);
    }
  }

  function advance(fromStep: Step, curTags: string[], curText: string) {
    if (fromStep === "mood") {
      push({ who: "agent", text: "好嘞。今天大概有多少时间？" }, 250);
      push({ who: "agent", chips: DURATION_CHIPS, step: "duration", freeInput: true }, 450);
    } else if (fromStep === "duration") {
      push({ who: "agent", text: "想要的氛围是哪种？" }, 250);
      push({ who: "agent", chips: VIBE_CHIPS, step: "vibe", freeInput: true }, 450);
    } else if (fromStep === "vibe") {
      push({ who: "agent", text: "你今天想用什么方式去这些地方？" }, 250);
      push({ who: "agent", chips: TRANSPORT_CHIPS, step: "transport", freeInput: true }, 450);
    } else if (fromStep === "transport") {
      // 记下交通偏好
      try {
        const t = curTags.find((x) => TRANSPORT_TAGS.has(x));
        if (t) localStorage.setItem("today.transport", t);
        else localStorage.removeItem("today.transport");
      } catch {}
      push({ who: "agent", text: "想再用一句话补充吗？（可选）" }, 250);
      push({ who: "agent", chips: [{ label: "不用了，给我推荐吧 →", tag: "", submit: true }], step: "extra", freeInput: true }, 450);
    } else if (fromStep === "extra") {
      finalize(curTags, curText);
    }
  }

  async function fetchIntro(card: PersonaCard, isReroll: boolean): Promise<string> {
    try {
      const userTurns = msgs.filter((m) => m.who === "user" && m.text).map((m) => m.text!) ;
      const res = await fetch("/api/public/personalize-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tags,
          freeText,
          userTurns,
          card: {
            identity: card.identity,
            mood: card.mood,
            mission: card.mission,
            rarity: card.rarity,
          },
          isReroll,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { intro?: string };
      return data.intro || (isReroll ? "那这张试试——" : "为你挑了这张卡 ✦");
    } catch {
      return isReroll ? "那这张试试——" : "为你挑了这张卡 ✦";
    }
  }

  async function presentCard(card: PersonaCard, isReroll = false) {
    push({ who: "agent", text: isReroll ? "好，再翻一张…" : "让我想想该挑哪一张…" }, 200);
    const intro = await fetchIntro(card, isReroll);
    push({ who: "agent", text: intro }, 350);
    push({ who: "agent", card, step: "result" }, 700);
    if (card.story) {
      const storyEmoji = pickEmoji(card.story) || pickEmoji(card.mood) || "✨";
      push({ who: "agent", text: `${storyEmoji}「${card.identity}」\n\n${card.story}` }, 1100);
    }
    if (card.routes && card.routes.length) {
      const numIcons = ["①", "②", "③", "④", "⑤"];
      const lines = card.routes
        .map((r, i) => {
          const e = pickEmoji(r) || "🌿";
          return `${numIcons[i] || `${i + 1}.`} ${r} ${e}`;
        })
        .join("\n");
      push({ who: "agent", text: `🗺️ 如果走进 TA 的一天，可能会是这样——\n\n${lines}\n\n💌 要不要就选 TA？` }, 1500);
    }
  }

  async function fetchRecommendCard(): Promise<string> {
    try {
      const userTurns = msgs.filter((m) => m.who === "user" && m.text).map((m) => m.text!);
      const res = await fetch("/api/public/recommend-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tags,
          freeText,
          userTurns,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { cardId?: string };
      return data.cardId || PERSONA_CARDS[0].id;
    } catch {
      // 回退：随机选一张
      return PERSONA_CARDS[Math.floor(Math.random() * PERSONA_CARDS.length)].id;
    }
  }

  async function finalize(_curTags: string[], _curText: string, skipIntro = false) {
    if (!skipIntro) {
      push({ who: "agent", text: "让我想想哪张卡最适合你…" }, 200);
    }
    const cardId = await fetchRecommendCard();
    const card = PERSONA_CARDS.find((c) => c.id === cardId) || PERSONA_CARDS[0];
    // 初始化排名列表（用于换一张）
    ranking.current = [card, ...PERSONA_CARDS.filter((c) => c.id !== cardId)];
    setRecIdx(0);
    void presentCard(card, false);
  }

  function reroll() {
    const next = (recIdx + 1) % ranking.current.length;
    setRecIdx(next);
    setMsgs((m) => [...m, { id: nextId(), who: "user", text: "再换一张" }]);
    void presentCard(ranking.current[next], true);
  }

  // 找到最后一条等待输入的 agent 消息
  const lastInteractive = useMemo(
    () => [...msgs].reverse().find((m) => m.chips || m.freeInput),
    [msgs],
  );

  return (
    <section className="relative z-10 agent-chat-wrap">
      <p className="text-center cn-serif text-[13px] text-[var(--ink-soft)] mb-5">
        让 AI 边聊边帮你挑一个今天的自己 ❦
      </p>

      <div
        ref={scrollRef}
        className="bg-[var(--muted)]/40 rounded-3xl border border-[var(--border)] p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3">
          {msgs.map((m) => (
            <MsgRow key={m.id} msg={m} onAccept={onAccept} onReroll={reroll} />
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="bubble agent typing-dots">
                <span /><span /><span />
              </div>
            </div>
          )}

          {/* chips */}
          {lastInteractive?.chips && (
            <div className="mt-2 pl-1">
              <div className="chip-group-hint">{lastInteractive.multi ? "点选 · 可多选" : "点选其一"}</div>
              <div className="flex flex-wrap gap-2">

                {lastInteractive.chips.map((c, i) => {
                  const isPicked = lastInteractive.multi && picked.includes(i);
                  return (
                    <button
                      key={i}
                      className={`chip ${isPicked ? "is-active" : ""}`}
                      onClick={() => {
                        if (lastInteractive.multi) {
                          setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
                        } else {
                          handleChip(lastInteractive.step!, c.label, c.tag, c.submit);
                        }
                      }}
                    >
                      {isPicked && <span className="mr-1">✓</span>}{c.label}
                    </button>
                  );
                })}
              </div>
              {lastInteractive.multi && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    type="button"
                    disabled={picked.length === 0}
                    onClick={() => handleMultiSubmit(lastInteractive.step!, lastInteractive.chips!)}
                    className="px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--card)] cn-serif text-[13px] disabled:opacity-40 transition"
                  >
                    确定（{picked.length}）
                  </button>
                  <span className="cn-serif text-[11px] text-[var(--ink-soft)] leading-snug">可以选多个，或者直接打字也行</span>
                </div>
              )}

            </div>
          )}

          {/* free input */}
          {lastInteractive?.freeInput && (
            <form
              onSubmit={(e) => { e.preventDefault(); handleFreeSubmit(lastInteractive.step!); }}
              className="mt-3 flex flex-col gap-2"
            >
              <div className="rounded-full sm:rounded-3xl bg-[var(--card)] border border-[var(--border)] focus-within:border-[var(--primary)] focus-within:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.2)] transition shadow-sm flex items-end gap-1.5 px-2 py-1.5">
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    aria-label={listening ? "停止语音" : "开始语音输入"}
                    className={`w-9 h-9 shrink-0 rounded-full border text-[14px] flex items-center justify-center transition self-end ${
                      listening
                        ? "bg-[oklch(0.6_0.18_25)] text-white border-transparent animate-pulse"
                        : "bg-[var(--background)] border-[var(--border)] text-[var(--ink)] hover:border-[var(--primary)]"
                    }`}
                  >
                    🎤
                  </button>
                )}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim()) handleFreeSubmit(lastInteractive.step!);
                    }
                  }}
                  rows={1}
                  placeholder={
                    listening
                      ? "听着呢…说吧"
                      : "聊聊你的状态…"
                  }
                  className="flex-1 min-w-0 px-1 py-2 bg-transparent cn-serif text-[15px] leading-snug text-[var(--ink)] placeholder:text-[var(--ink-soft)] resize-none outline-none min-h-[36px] max-h-[140px]"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="发送"
                  className="w-9 h-9 shrink-0 rounded-full bg-[var(--ink)] text-[var(--card)] cn-serif text-[13px] disabled:opacity-40 transition flex items-center justify-center self-end"
                >
                  ↑
                </button>
              </div>
              <div className="hidden sm:block px-2 text-[11px] cn-serif text-[var(--ink-soft)]">
                Enter 发送 · Shift+Enter 换行
              </div>

              {voiceError && (
                <div className="px-1 text-[11px] cn-serif text-[oklch(0.55_0.15_25)]">{voiceError}</div>
              )}
            </form>
          )}

        </div>
      </div>

      <div className="text-center text-[11px] cn-serif text-[var(--ink-soft)] mt-3">
        点气泡就行，也可以打字补充 — 都可以。
      </div>
    </section>
  );
}

function MsgRow({
  msg, onAccept, onReroll,
}: {
  msg: ChatMsg;
  onAccept: (c: PersonaCard) => void;
  onReroll: () => void;
}) {
  if (msg.card) {
    return (
      <div className="flex justify-start">
        <RecCard card={msg.card} onAccept={onAccept} onReroll={onReroll} />
      </div>
    );
  }
  if (!msg.text) return null;
  return (
    <div className={`flex ${msg.who === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`bubble ${msg.who}`}>{msg.text}</div>
    </div>
  );
}

function RecCard({
  card, onAccept, onReroll,
}: {
  card: PersonaCard;
  onAccept: (c: PersonaCard) => void;
  onReroll: () => void;
}) {
  const [a, b, c] = card.colors;
  return (
    <div
      className="persona-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] w-[min(260px,100%)] shadow-[0_14px_36px_-20px_rgba(0,0,0,0.25)] fade-up"
      data-rarity={card.rarity}
    >
      <div
        className="relative aspect-[3/4] w-full overflow-hidden"
        style={card.cover ? undefined : { background: `linear-gradient(160deg, ${a}, ${b})` }}
      >
        {card.cover ? (
          <img src={card.cover} alt={card.identity} loading="lazy" className="absolute inset-0 w-full h-full object-cover object-center" />
        ) : (
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: `radial-gradient(circle at 25% 30%, ${c} 0%, transparent 45%), radial-gradient(circle at 75% 70%, ${a} 0%, transparent 50%)`,
            }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-2 left-2 rarity-chip" data-rarity={card.rarity}>
          ✦ {card.rarity} · {RARITY_LABEL[card.rarity]}
        </div>
      </div>
      <div className="p-3.5">
        <div className="cn-serif text-[10px] tracking-[0.22em] text-[var(--ink-soft)]">为你推荐</div>
        <h3 className="cn-serif text-[14.5px] leading-snug mt-1 text-[var(--ink)]">{card.identity}</h3>
        <div className="mt-1.5 cn-serif text-[12px] text-[var(--ink-soft)] italic line-clamp-2">
          「{card.mission}」
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onAccept(card)}
            className="flex-1 px-3 py-2 rounded-full bg-[var(--ink)] text-[var(--card)] cn-serif text-[12.5px]"
          >
            就是它 →
          </button>
          <button
            onClick={onReroll}
            className="px-3 py-2 rounded-full border border-[var(--border)] cn-serif text-[12.5px] text-[var(--ink-soft)]"
          >
            换一张
          </button>
        </div>
      </div>
    </div>
  );
}
