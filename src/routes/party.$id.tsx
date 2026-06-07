import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadParty, joinParty, setMemberCheck, subscribeParty, getOrCreateMeId, type PartyRow, type PartyMember } from "@/lib/party";
import { groupPreset } from "@/lib/group-mode";
import { VenueIcon } from "@/components/VenueIcon";
import { toast } from "sonner";

export const Route = createFileRoute("/party/$id")({ component: PartyPage });

const NAME_KEY = "todaypersona:party-name";
const EMOJI_OPTIONS = ["🦊", "🐱", "🐻", "🐰", "🐶", "🐼", "🦝", "🦦", "🌿", "✦"];

function PartyPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [party, setParty] = useState<PartyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<PartyMember | null>(null);
  const [name, setName] = useState<string>(() => (typeof window !== "undefined" ? localStorage.getItem(NAME_KEY) ?? "" : ""));
  const [emoji, setEmoji] = useState<string>("🦊");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let stop = () => {};
    void (async () => {
      const p = await loadParty(id);
      setParty(p);
      setLoading(false);
      if (p) {
        const meId = getOrCreateMeId(id);
        const existing = p.members.find((m) => m.id === meId);
        if (existing) {
          setMe(existing);
          if (existing.emoji) setEmoji(existing.emoji);
        }
      }
      stop = subscribeParty(id, (next) => {
        setParty(next);
        const meId = getOrCreateMeId(id);
        const updatedMe = next.members.find((m) => m.id === meId);
        if (updatedMe) setMe(updatedMe);
      });
    })();
    return () => stop();
  }, [id]);

  async function handleJoin() {
    const finalName = name.trim();
    if (!finalName) {
      toast.error("起个名字吧");
      return;
    }
    localStorage.setItem(NAME_KEY, finalName);
    setJoining(true);
    const member = await joinParty(id, finalName, emoji);
    setJoining(false);
    if (!member) {
      toast.error("加入失败");
      return;
    }
    setMe(member);
    const p = await loadParty(id);
    setParty(p);
    toast.success("加入成功，开走 ✦");
  }

  async function toggleCheck(order: number) {
    if (!me) return;
    const checked = !me.checkedOrders.includes(order);
    // optimistic
    setMe({ ...me, checkedOrders: checked ? [...me.checkedOrders, order] : me.checkedOrders.filter((o) => o !== order) });
    await setMemberCheck(id, me.id, order, checked);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center cn-serif text-[var(--ink-soft)]">
        正在打开同行路线…
      </div>
    );
  }

  if (!party) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="cn-serif text-[20px] text-[var(--ink)]">链接已失效或不存在</h2>
        <p className="cn-serif text-[13px] text-[var(--ink-soft)]">让朋友重新生成一条吧。</p>
        <button onClick={() => navigate({ to: "/" })} className="btn-soft mt-2">回到首页</button>
      </div>
    );
  }

  const preset = groupPreset(party.group_mode);
  const total = party.journey.scenes.length;

  return (
    <div className="min-h-screen pb-16" style={{ background: "linear-gradient(180deg, #eef2e6 0%, #e3ebda 50%, #d9e4cf 100%)" }}>
      <div className="max-w-xl mx-auto px-5 pt-8">
        <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">PARTY · {preset.label}</div>
        <h1 className="cn-serif text-[22px] text-[var(--ink)] mt-1">{party.card.identity}</h1>
        <div className="cn-serif text-[13px] text-[var(--ink-soft)] mt-1">
          「{party.card.mission}」{party.city && <span className="display italic text-[11px] ml-1.5">· {party.city}</span>}
        </div>
        <p className="cn-serif text-[14px] leading-[1.85] text-[var(--ink)] mt-3">
          {party.journey.story_opening}
        </p>
      </div>

      {/* Members */}
      <div className="max-w-xl mx-auto px-5 mt-5">
        <div className="cn-serif text-[11px] tracking-[0.2em] text-[var(--ink-soft)] mb-2">
          同行 · {party.members.length} 人
        </div>
        <div className="flex flex-wrap gap-2">
          {party.members.map((m) => (
            <span
              key={m.id}
              className={`rounded-full border px-3 py-1 cn-serif text-[12.5px] ${
                me?.id === m.id ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]" : "bg-[var(--card)] border-[var(--border)] text-[var(--ink)]"
              }`}
            >
              {m.emoji ?? "✦"} {m.name} <span className="opacity-60 ml-1 text-[11px]">{m.checkedOrders.length}/{total}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Join form */}
      {!me && (
        <div className="max-w-xl mx-auto px-5 mt-5">
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4">
            <div className="cn-serif text-[13px] text-[var(--ink)] mb-2">先告诉大家你是谁吧</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你的名字 / 昵称"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 cn-serif text-[14px] text-[var(--ink)] outline-none focus:border-[var(--ink)] mb-3"
            />
            <div className="flex flex-wrap gap-1.5 mb-3">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-8 h-8 rounded-full border text-[16px] flex items-center justify-center ${
                    emoji === e ? "border-[var(--ink)] bg-[var(--ink)]/5" : "border-[var(--border)]"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <button onClick={handleJoin} disabled={joining} className="w-full btn-soft">
              {joining ? "加入中…" : "加入这条路线 ✦"}
            </button>
          </div>
        </div>
      )}

      {/* Scenes list */}
      <div className="max-w-xl mx-auto px-5 mt-6 space-y-3">
        {party.journey.scenes.map((s) => {
          const myChecked = !!me && me.checkedOrders.includes(s.order);
          const checkers = party.members.filter((m) => m.checkedOrders.includes(s.order));
          return (
            <div key={s.order} className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center">
                  <VenueIcon type={s.location_type} className="w-4 h-4 text-[var(--ink)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="display italic text-[10.5px] tracking-[0.2em] text-[var(--ink-soft)]">SCENE {s.order}</div>
                  <h3 className="cn-serif text-[15px] text-[var(--ink)] mt-0.5">{s.scene_name}</h3>
                  <div className="cn-serif text-[12.5px] text-[var(--ink-soft)] mt-0.5">{s.location_name} · {s.location_hint}</div>
                  <p className="cn-serif text-[13px] text-[var(--ink)] leading-relaxed mt-2">{s.action_task}</p>

                  {checkers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {checkers.map((m) => (
                        <span key={m.id} className="text-[11px] cn-serif text-[var(--ink-soft)] bg-[var(--bg)] border border-[var(--border)] rounded-full px-2 py-0.5">
                          {m.emoji ?? "✦"} {m.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {me && (
                    <button
                      onClick={() => toggleCheck(s.order)}
                      className={`mt-3 px-3 py-1.5 rounded-full cn-serif text-[12.5px] border transition ${
                        myChecked
                          ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
                          : "bg-[var(--card)] text-[var(--ink)] border-[var(--border)] hover:border-[var(--ink)]"
                      }`}
                    >
                      {myChecked ? "✓ 已到达" : "我到这了"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="max-w-xl mx-auto px-5 mt-8 text-center">
        <button onClick={() => navigate({ to: "/" })} className="display text-[11px] tracking-[0.3em] text-[var(--ink-soft)]">
          也想抽自己的人设卡 →
        </button>
      </div>
    </div>
  );
}
