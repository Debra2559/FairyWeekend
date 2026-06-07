import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { replaceJourney } from "@/lib/persona-store";
import type { Journey, PersonaCard } from "@/lib/persona-types";
import { toast } from "sonner";

interface Msg {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

const SUGGESTIONS = [
  "把第 2 站换成安静一点的咖啡馆",
  "加一站可以拍照的小店",
  "下午太赶了，去掉最后一站",
  "换一家更便宜的餐厅",
];

export function JourneyChatPanel({
  card,
  city,
  journey,
  onUpdated,
}: {
  card: PersonaCard;
  city?: string;
  journey: Journey;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, msgs, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const userMsg: Msg = { role: "user", text: q, ts: Date.now() };
    setMsgs((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("adjust-journey", {
        body: {
          card,
          city,
          journey,
          request: q,
          history: msgs.slice(-6),
        },
      });
      if (error) throw error;
      const reply: string = data?.reply || "好的，我看看。";
      const changed: boolean = !!data?.changed;
      const newJourney: Journey | undefined = data?.journey;
      setMsgs((m) => [...m, { role: "assistant", text: reply, ts: Date.now() }]);
      if (changed && newJourney?.scenes?.length) {
        replaceJourney(newJourney);
        onUpdated();
        toast.success("路线已更新");
      }
    } catch (e) {
      console.error(e);
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: "出了点问题，再说一次试试？", ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* 浮动入口按钮 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-5 z-[80] rounded-full px-4 py-3 cn-serif text-[13px] text-[var(--card)] bg-[var(--ink)] shadow-lg flex items-center gap-2 hover:opacity-90 transition"
          style={{ boxShadow: "0 8px 24px -8px rgba(0,0,0,0.35)" }}
        >
          <span className="text-[15px]">✦</span>
          <span>对话调整路线</span>
        </button>
      )}

      {/* 抽屉 */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-[var(--ink)]/30 backdrop-blur-sm fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[95] max-w-xl mx-auto bg-[var(--card)] rounded-t-3xl border border-[var(--border)] shadow-2xl flex flex-col fade-up"
            style={{ maxHeight: "78vh" }}
          >
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <div className="display italic text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
                  ROUTE · CHAT
                </div>
                <div className="cn-serif text-[15px] text-[var(--ink)] mt-0.5">
                  跟我说怎么改
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="display text-[11px] tracking-[0.2em] text-[var(--ink-soft)] px-3 py-1.5 rounded-full hover:bg-[var(--muted)]"
              >
                收起 ▾
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {msgs.length === 0 && (
                <div className="cn-serif text-[13px] text-[var(--ink-soft)] leading-relaxed">
                  你可以让我换一站、加一站、删掉一站，或者改风格、改顺序。试试：
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="chip"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`cn-serif text-[14px] leading-relaxed ${
                    m.role === "user" ? "text-right" : ""
                  }`}
                >
                  {m.role === "user" ? (
                    <span className="inline-block max-w-[85%] text-left px-3.5 py-2 rounded-2xl bg-[var(--ink)] text-[var(--card)]">
                      {m.text}
                    </span>
                  ) : (
                    <div className="text-[var(--ink)]">
                      <span className="display italic text-[10px] tracking-[0.2em] text-[var(--ink-soft)] mr-1.5">
                        ✦ AI
                      </span>
                      {m.text}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="cn-serif text-[13px] text-[var(--ink-soft)] italic">
                  <span className="display italic text-[10px] tracking-[0.2em] mr-1.5">✦ AI</span>
                  正在重排你的下午
                  <span className="inline-flex ml-1 items-center gap-0.5 align-middle">
                    <span className="w-1 h-1 rounded-full bg-[var(--ink-soft)] animate-pulse" />
                    <span className="w-1 h-1 rounded-full bg-[var(--ink-soft)] animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="w-1 h-1 rounded-full bg-[var(--ink-soft)] animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </span>
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="px-4 pb-4 pt-2 border-t border-[var(--border)] flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="比如：把第 2 站换成安静的咖啡馆"
                className="flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 cn-serif text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--ink-soft)] max-h-32"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 rounded-full px-4 py-2.5 cn-serif text-[13px] text-[var(--card)] bg-[var(--ink)] disabled:opacity-40 hover:opacity-90 transition"
              >
                {loading ? "…" : "发送"}
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
