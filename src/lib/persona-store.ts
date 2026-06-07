import type { JourneyRunState, PersonaCard, Journey, SceneRecord } from "./persona-types";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const KEY = "todaypersona:run:v1";
const CARD_KEY = "todaypersona:card:v1";
const SAGA_KEY = "todaypersona:saga:v1"; // persistent archive across runs
const PLAYER_KEY = "default";

export interface ArchivedChapter extends JourneyRunState {
  chapterId: string;
  archivedAt: number;
}

export function loadSagas(): ArchivedChapter[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SAGA_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as ArchivedChapter[]; } catch { return []; }
}

function saveSagas(list: ArchivedChapter[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAGA_KEY, JSON.stringify(list));
}

function mergeSagas(local: ArchivedChapter[], remote: ArchivedChapter[]): ArchivedChapter[] {
  const map = new Map<string, ArchivedChapter>();
  for (const item of [...remote, ...local]) {
    const existing = map.get(item.chapterId);
    if (!existing || (item.archivedAt ?? 0) > (existing.archivedAt ?? 0)) {
      map.set(item.chapterId, item);
    }
  }
  return [...map.values()]
    .sort((a, b) => (b.archivedAt ?? b.createdAt) - (a.archivedAt ?? a.createdAt))
    .slice(0, 100);
}

export async function syncChapterToCloud(chapter: ArchivedChapter) {
  try {
    const { error } = await supabase.from("saga_archive").upsert(
      {
        chapter_id: chapter.chapterId,
        player_key: PLAYER_KEY,
        chapter: chapter as unknown as Json,
        city: chapter.city ?? null,
        card_identity: chapter.card.identity,
        completed_count: chapter.completedSceneOrders.length,
        total_count: chapter.journey.scenes.length,
        archived_at: new Date(chapter.archivedAt).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "chapter_id" },
    );
    if (error) console.warn("[saga cloud sync]", error.message);
  } catch (error) {
    console.warn("[saga cloud sync]", error);
  }
}

export async function loadCloudSagas(): Promise<ArchivedChapter[]> {
  try {
    const { data, error } = await supabase
      .from("saga_archive")
      .select("chapter")
      .eq("player_key", PLAYER_KEY)
      .order("archived_at", { ascending: false })
      .limit(100);
    if (error) {
      console.warn("[saga cloud load]", error.message);
      return [];
    }
    return (data ?? [])
      .map((row) => row.chapter as unknown as ArchivedChapter)
      .filter((chapter) => chapter?.chapterId && chapter?.journey);
  } catch (error) {
    console.warn("[saga cloud load]", error);
    return [];
  }
}

export async function hydrateSagasFromCloud(): Promise<ArchivedChapter[]> {
  const local = loadSagas();
  const remote = await loadCloudSagas();
  const merged = mergeSagas(local, remote);
  saveSagas(merged);
  return merged;
}

async function deleteCloudChapter(chapterId: string) {
  try {
    const { error } = await supabase.from("saga_archive").delete().eq("chapter_id", chapterId);
    if (error) console.warn("[saga cloud delete]", error.message);
  } catch (error) {
    console.warn("[saga cloud delete]", error);
  }
}

function chapterToQuestPayload(chapter: ArchivedChapter) {
  return {
    player_key: PLAYER_KEY,
    character_class: chapter.card.identity,
    emotion: chapter.card.mood,
    city: chapter.city ?? "",
    quest: {
      quest_name: chapter.card.mission,
      quest_brief: chapter.journey.story_opening,
      stages: chapter.journey.scenes.map((scene) => ({
        order: scene.order,
        stage_name: scene.scene_name,
        location_name: scene.location_name,
        location_type: scene.location_type,
        emotion_tags: scene.emotion_tags,
      })),
    },
    stages_unlocked: chapter.completedSceneOrders.length,
    liked_stage_orders: chapter.completedSceneOrders,
    feedback: Object.values(chapter.sceneRecords ?? {})
      .map((record) => record.note)
      .filter(Boolean)
      .join("；")
      .slice(0, 500),
  };
}

export async function recordChapterToMemory(chapter: ArchivedChapter) {
  try {
    const { error } = await supabase.functions.invoke("record-quest", {
      body: chapterToQuestPayload(chapter),
    });
    if (error) console.warn("[record quest]", error.message);
  } catch (error) {
    console.warn("[record quest]", error);
  }
}

export function archiveCurrentRun(): ArchivedChapter | null {
  const run = loadRun();
  if (!run) return null;
  const list = loadSagas();
  const chapterId = `ch-${run.createdAt}`;
  // Avoid duplicate archive of the same run
  if (list.some((c) => c.chapterId === chapterId)) return list.find((c) => c.chapterId === chapterId) ?? null;
  const chapter: ArchivedChapter = { ...run, chapterId, archivedAt: Date.now() };
  const next = [chapter, ...list].slice(0, 100);
  saveSagas(next);
  void syncChapterToCloud(chapter);
  void recordChapterToMemory(chapter);
  return chapter;
}

export function deleteChapter(chapterId: string) {
  saveSagas(loadSagas().filter((c) => c.chapterId !== chapterId));
  void deleteCloudChapter(chapterId);
}

export interface LibraryEntry {
  name: string;
  type: string;
  level: number;     // = visits with photo/note count (enhancement)
  visits: number;    // total times visited
  lastAt: number;
  emotions: string[];
  hasPhoto: boolean;
  hasNote: boolean;
}

export function buildLibrary(sagas = loadSagas()): { places: LibraryEntry[]; activities: LibraryEntry[] } {
  const places = new Map<string, LibraryEntry>();
  const activities = new Map<string, LibraryEntry>();
  for (const ch of sagas) {
    for (const s of ch.journey.scenes) {
      const rec = ch.sceneRecords?.[s.order];
      if (!ch.completedSceneOrders.includes(s.order)) continue;
      const enhanced = !!(rec?.note || rec?.photo);
      const pKey = s.location_name;
      const p = places.get(pKey) ?? { name: pKey, type: s.location_type, level: 0, visits: 0, lastAt: 0, emotions: [] as string[], hasPhoto: false, hasNote: false };
      p.visits += 1;
      if (enhanced) p.level += 1;
      if (rec?.photo) p.hasPhoto = true;
      if (rec?.note) p.hasNote = true;
      p.lastAt = Math.max(p.lastAt, rec?.completedAt ?? ch.archivedAt);
      for (const e of s.emotion_tags) if (!p.emotions.includes(e)) p.emotions.push(e);
      places.set(pKey, p);

      const aKey = s.action_task;
      const a = activities.get(aKey) ?? { name: aKey, type: s.scene_name, level: 0, visits: 0, lastAt: 0, emotions: [] as string[], hasPhoto: false, hasNote: false };
      a.visits += 1;
      if (enhanced) a.level += 1;
      if (rec?.photo) a.hasPhoto = true;
      if (rec?.note) a.hasNote = true;
      a.lastAt = Math.max(a.lastAt, rec?.completedAt ?? ch.archivedAt);
      for (const e of s.emotion_tags) if (!a.emotions.includes(e)) a.emotions.push(e);
      activities.set(aKey, a);
    }
  }
  const byLevel = (x: LibraryEntry, y: LibraryEntry) => y.level - x.level || y.visits - x.visits;
  return {
    places: [...places.values()].sort(byLevel),
    activities: [...activities.values()].sort(byLevel),
  };
}


export function saveRun(run: JourneyRunState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(run));
}

export function loadRun(): JourneyRunState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as JourneyRunState; } catch { return null; }
}

export function clearRun() {
  if (typeof window !== "undefined") sessionStorage.removeItem(KEY);
}

export function savePendingCard(card: PersonaCard) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CARD_KEY, JSON.stringify(card));
}
export function loadPendingCard(): PersonaCard | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(CARD_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as PersonaCard; } catch { return null; }
}

export function startRun(card: PersonaCard, journey: Journey, city?: string, groupMode?: JourneyRunState["groupMode"]): JourneyRunState {
  const run: JourneyRunState = {
    card,
    city,
    journey,
    completedSceneOrders: [],
    createdAt: Date.now(),
    groupMode: groupMode ?? "solo",
  };
  saveRun(run);
  return run;
}

export function setRunPartyId(partyId: string) {
  const run = loadRun();
  if (!run) return;
  run.partyId = partyId;
  saveRun(run);
}

export function replaceJourney(journey: Journey) {
  const run = loadRun();
  if (!run) return;
  // 保留已完成的 scene order，但过滤掉新 journey 里不存在的
  const validOrders = new Set(journey.scenes.map((s) => s.order));
  run.journey = journey;
  run.completedSceneOrders = run.completedSceneOrders.filter((o) => validOrders.has(o));
  if (run.sceneRecords) {
    const next: Record<number, SceneRecord> = {};
    for (const [k, v] of Object.entries(run.sceneRecords)) {
      const order = Number(k);
      if (validOrders.has(order)) next[order] = v;
    }
    run.sceneRecords = next;
  }
  saveRun(run);
}


export function completeScene(order: number) {
  const run = loadRun();
  if (!run) return;
  if (!run.completedSceneOrders.includes(order)) {
    run.completedSceneOrders.push(order);
    saveRun(run);
  }
}

export function recordScene(order: number, patch: Partial<Omit<SceneRecord, "completedAt">>) {
  const run = loadRun();
  if (!run) return;
  const records = run.sceneRecords ?? {};
  const prev = records[order];
  records[order] = {
    ...(prev ?? {}),
    ...patch,
    completedAt: prev?.completedAt ?? Date.now(),
  };
  run.sceneRecords = records;
  if (!run.completedSceneOrders.includes(order)) {
    run.completedSceneOrders.push(order);
  }
  saveRun(run);
}

export function reserveScene(order: number, reserved: boolean) {
  const run = loadRun();
  if (!run) return;
  const records = run.sceneRecords ?? {};
  const prev = records[order] ?? { completedAt: Date.now() };
  records[order] = {
    ...prev,
    reserved,
    reservedAt: reserved ? Date.now() : undefined,
  };
  run.sceneRecords = records;
  saveRun(run);
}

export function clearSceneRecord(order: number) {
  const run = loadRun();
  if (!run) return;
  if (run.sceneRecords) delete run.sceneRecords[order];
  run.completedSceneOrders = run.completedSceneOrders.filter((o) => o !== order);
  saveRun(run);
}
