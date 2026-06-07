import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createParty, buildPartyShareUrl, subscribeParty, type PartyMember, loadParty } from "@/lib/party";
import { setRunPartyId } from "@/lib/persona-store";
import type { JourneyRunState } from "@/lib/persona-types";
import { groupPreset, type GroupMode } from "@/lib/group-mode";

const HOST_NAME_KEY = "todaypersona:host-name";

export function JourneyInviteFab({ run }: { run: JourneyRunState }) {
  const [partyId, setPartyId] = useState<string | undefined>(run.partyId);
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [open, setOpen] = useState(false);

  const groupMode: GroupMode = (run.groupMode as GroupMode) ?? "friends";
  const preset = groupPreset(groupMode);
  const shareUrl = partyId ? buildPartyShareUrl(partyId) : "";

  useEffect(() => { setPartyId(run.partyId); }, [run.partyId]);

  useEffect(() => {
    if (!partyId) return;
    let stop = () => {};
    void loadParty(partyId).then((p) => { if (p) setMembers(p.members); });
    stop = subscribeParty(partyId, (p) => setMembers(p.members));
    return () => stop();
  }, [partyId]);

  async function ensurePartyAndShare() {
    let id = partyId;
    if (!id) {
      setBusy(true);
      try {
        const name = (typeof window !== "undefined" && localStorage.getItem(HOST_NAME_KEY)) || "我";
        id = await createParty({
          card: run.card,
          journey: run.journey,
          city: run.city,
          groupMode,
          hostName: name,
          hostEmoji: preset.emoji,
        });
        setRunPartyId(id);
        setPartyId(id);
      } catch (e) {
        console.error(e);
        toast.error("生成失败，再试一次");
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    const url = buildPartyShareUrl(id!);
    // Web share API 优先
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${run.card.identity} · 一起走这条路线`,
          text: `${preset.emoji} ${preset.label} · ${run.card.mission}`,
          url,
        });
        return;
      } catch { /* user cancelled, fallback to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("同行链接已复制 ✦ 发给朋友即可");
    } catch {
      setOpen(true);
    }
  }

  // 成员头像（最多 3 个）
  const avatars = members.slice(0, 3);
  const extra = Math.max(0, members.length - avatars.length);
  const hasMembers = members.length > 0;

  return (
    <>
      <button
        onClick={ensurePartyAndShare}
        disabled={busy}
        title={partyId ? "分享同行链接" : "生成同行链接"}
        className="fixed right-4 bottom-24 z-30 rounded-full pl-3 pr-4 py-2 bg-[var(--ink)] text-[var(--bg)] cn-serif text-[12.5px] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] hover:scale-[1.02] transition flex items-center gap-2"
      >
        {hasMembers ? (
          <span className="flex -space-x-1.5">
            {avatars.map((m) => (
              <span
                key={m.id}
                className="w-6 h-6 rounded-full bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center text-[11px] border border-[var(--ink)] shadow-sm"
                title={m.name}
              >
                {m.emoji ?? m.name.slice(0, 1)}
              </span>
            ))}
            {extra > 0 && (
              <span className="w-6 h-6 rounded-full bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center text-[10px] border border-[var(--ink)]">
                +{extra}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[14px] leading-none">🔗</span>
        )}
        <span>
          {busy ? "生成中…" : hasMembers ? `${members.length} 人同行 · 分享` : "邀请同行"}
        </span>
      </button>

      {open && shareUrl && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="cn-serif text-[14px] text-[var(--ink)] mb-2">把这条链接发给朋友</div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[12px] break-all text-[var(--ink)] mb-3 select-all">
              {shareUrl}
            </div>
            <button onClick={() => setOpen(false)} className="btn-soft w-full">好</button>
          </div>
        </div>
      )}
    </>
  );
}
