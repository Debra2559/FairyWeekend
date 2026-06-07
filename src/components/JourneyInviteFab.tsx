import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createParty, buildPartyShareUrl, subscribeParty, type PartyMember, loadParty } from "@/lib/party";
import { setRunPartyId } from "@/lib/persona-store";
import type { JourneyRunState } from "@/lib/persona-types";
import { groupPreset, type GroupMode } from "@/lib/group-mode";

const HOST_NAME_KEY = "todaypersona:host-name";

export function JourneyInviteFab({ run }: { run: JourneyRunState }) {
  const [open, setOpen] = useState(false);
  const [partyId, setPartyId] = useState<string | undefined>(run.partyId);
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [hostName, setHostName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(HOST_NAME_KEY) ?? "";
  });

  const groupMode: GroupMode = (run.groupMode as GroupMode) ?? "friends";
  const preset = groupPreset(groupMode);
  const shareUrl = partyId ? buildPartyShareUrl(partyId) : "";

  useEffect(() => { setPartyId(run.partyId); }, [run.partyId]);

  // 加载 + 订阅成员变化
  useEffect(() => {
    if (!partyId) return;
    let stop = () => {};
    void loadParty(partyId).then((p) => { if (p) setMembers(p.members); });
    stop = subscribeParty(partyId, (p) => setMembers(p.members));
    return () => stop();
  }, [partyId]);

  async function handleCreate() {
    const name = hostName.trim() || "我";
    if (typeof window !== "undefined") localStorage.setItem(HOST_NAME_KEY, name);
    setCreating(true);
    try {
      const id = await createParty({
        card: run.card,
        journey: run.journey,
        city: run.city,
        groupMode,
        hostName: name,
        hostEmoji: preset.emoji,
      });
      setRunPartyId(id);
      setPartyId(id);
      toast.success("链接已生成，发给朋友吧 ✦");
    } catch (e) {
      console.error(e);
      toast.error("生成失败，再试一次");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("链接已复制 ✦");
    } catch {
      toast.error("复制失败，请手动选择链接");
    }
  }

  async function nativeShare() {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${run.card.identity} · 一起走这条路线`,
          text: `${preset.emoji} ${preset.label} · ${run.card.mission}`,
          url: shareUrl,
        });
      } catch {/* user cancelled */}
    } else {
      void copyLink();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-24 z-30 rounded-full px-4 py-2.5 bg-[var(--ink)] text-[var(--bg)] cn-serif text-[12.5px] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] hover:scale-[1.02] transition"
      >
        {preset.emoji} 邀请同行
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">INVITE · {preset.label}</div>
                <h3 className="cn-serif text-[18px] text-[var(--ink)] mt-1">{preset.emoji} 一起走这条路线</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-[var(--ink-soft)] text-lg leading-none">×</button>
            </div>

            {!partyId ? (
              <>
                <p className="cn-serif text-[13px] text-[var(--ink-soft)] leading-relaxed mb-3">
                  给你自己起个名字，生成一条专属链接。朋友点进去就能看到同一条路线，并各自打卡。
                </p>
                <input
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="你的名字 / 昵称"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 cn-serif text-[14px] text-[var(--ink)] outline-none focus:border-[var(--ink)] mb-3"
                />
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full btn-soft"
                >
                  {creating ? "生成中…" : "生成同行链接 ✦"}
                </button>
              </>
            ) : (
              <>
                <p className="cn-serif text-[12.5px] text-[var(--ink-soft)] mb-2">把这条链接发给朋友：</p>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[12px] break-all text-[var(--ink)] mb-3 select-all">
                  {shareUrl}
                </div>
                <div className="flex gap-2 mb-4">
                  <button onClick={copyLink} className="flex-1 btn-soft">复制链接</button>
                  <button onClick={nativeShare} className="flex-1 rounded-full border border-[var(--border)] px-4 py-2 cn-serif text-[13px] text-[var(--ink)]">分享…</button>
                </div>

                <div className="cn-serif text-[11.5px] tracking-[0.2em] text-[var(--ink-soft)] mb-2">
                  当前同行 · {members.length} 人
                </div>
                <ul className="space-y-1.5 max-h-40 overflow-auto">
                  {members.map((m) => {
                    const total = run.journey.scenes.length;
                    const done = m.checkedOrders.length;
                    return (
                      <li key={m.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-1.5">
                        <span className="cn-serif text-[13px] text-[var(--ink)]">
                          {m.emoji ?? "✦"} {m.name} {m.isHost && <span className="text-[10px] text-[var(--ink-soft)] ml-1">主持</span>}
                        </span>
                        <span className="display italic text-[11px] text-[var(--ink-soft)]">{done}/{total}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
