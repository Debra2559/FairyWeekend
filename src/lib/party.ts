import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { PersonaCard, Journey } from "./persona-types";
import type { GroupMode } from "./group-mode";

export interface PartyMember {
  id: string;            // local uuid
  name: string;
  emoji?: string;
  checkedOrders: number[];
  joinedAt: number;
  isHost?: boolean;
}

export interface PartyRow {
  id: string;
  card: PersonaCard;
  journey: Journey;
  city?: string;
  group_mode: GroupMode;
  members: PartyMember[];
  created_at: string;
  updated_at: string;
}

const ME_KEY_PREFIX = "todaypersona:party-me:";

function rid(prefix = "p"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getOrCreateMeId(partyId: string): string {
  if (typeof window === "undefined") return rid("m");
  const k = ME_KEY_PREFIX + partyId;
  const existing = localStorage.getItem(k);
  if (existing) return existing;
  const id = rid("m");
  localStorage.setItem(k, id);
  return id;
}

export async function createParty(args: {
  card: PersonaCard;
  journey: Journey;
  city?: string;
  groupMode: GroupMode;
  hostName: string;
  hostEmoji?: string;
}): Promise<string> {
  const id = rid("party");
  const hostId = rid("m");
  if (typeof window !== "undefined") {
    localStorage.setItem(ME_KEY_PREFIX + id, hostId);
  }
  const host: PartyMember = {
    id: hostId,
    name: args.hostName || "我",
    emoji: args.hostEmoji,
    checkedOrders: [],
    joinedAt: Date.now(),
    isHost: true,
  };
  const { error } = await supabase.from("journey_parties" as never).insert({
    id,
    card: args.card as unknown as Json,
    journey: args.journey as unknown as Json,
    city: args.city ?? null,
    group_mode: args.groupMode,
    members: [host] as unknown as Json,
  } as never);
  if (error) throw error;
  return id;
}

export async function loadParty(id: string): Promise<PartyRow | null> {
  const { data, error } = await supabase
    .from("journey_parties" as never)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as PartyRow;
}

export async function joinParty(id: string, name: string, emoji?: string): Promise<PartyMember | null> {
  const party = await loadParty(id);
  if (!party) return null;
  const meId = getOrCreateMeId(id);
  const existing = party.members.find((m) => m.id === meId);
  if (existing) {
    if (existing.name !== name || existing.emoji !== emoji) {
      existing.name = name;
      existing.emoji = emoji;
      await supabase
        .from("journey_parties" as never)
        .update({ members: party.members as unknown as Json, updated_at: new Date().toISOString() } as never)
        .eq("id", id);
    }
    return existing;
  }
  const member: PartyMember = {
    id: meId,
    name: name || "朋友",
    emoji,
    checkedOrders: [],
    joinedAt: Date.now(),
  };
  const nextMembers = [...party.members, member];
  const { error } = await supabase
    .from("journey_parties" as never)
    .update({ members: nextMembers as unknown as Json, updated_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) return null;
  return member;
}

export async function setMemberCheck(id: string, memberId: string, order: number, checked: boolean): Promise<void> {
  const party = await loadParty(id);
  if (!party) return;
  const members = party.members.map((m) => {
    if (m.id !== memberId) return m;
    const set = new Set(m.checkedOrders);
    if (checked) set.add(order); else set.delete(order);
    return { ...m, checkedOrders: [...set].sort((a, b) => a - b) };
  });
  await supabase
    .from("journey_parties" as never)
    .update({ members: members as unknown as Json, updated_at: new Date().toISOString() } as never)
    .eq("id", id);
}

export function buildPartyShareUrl(id: string): string {
  if (typeof window === "undefined") return `/party/${id}`;
  return `${window.location.origin}/party/${id}`;
}

export function subscribeParty(id: string, onChange: (p: PartyRow) => void) {
  const channel = supabase
    .channel(`party-${id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "journey_parties", filter: `id=eq.${id}` },
      (payload) => {
        const next = (payload.new ?? payload.old) as unknown as PartyRow | undefined;
        if (next) onChange(next);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
