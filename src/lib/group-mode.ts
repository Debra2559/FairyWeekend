export type GroupMode = "solo" | "couple" | "friends" | "family";

export interface GroupPreset {
  id: GroupMode;
  label: string;
  emoji: string;
  hint: string;
}

export const GROUP_PRESETS: GroupPreset[] = [
  { id: "solo",    label: "独自一人", emoji: "🚶", hint: "一个人慢慢晃" },
  { id: "couple",  label: "二人世界", emoji: "💞", hint: "和 ta 走一段" },
  { id: "friends", label: "朋友局",   emoji: "🍻", hint: "一帮人随便逛" },
  { id: "family",  label: "家庭日",   emoji: "🏡", hint: "带上家人小孩" },
];

const KEY = "todaypersona:group:v1";

export function loadGroupMode(): GroupMode {
  if (typeof window === "undefined") return "solo";
  const v = sessionStorage.getItem(KEY);
  if (v === "solo" || v === "couple" || v === "friends" || v === "family") return v;
  return "solo";
}

export function saveGroupMode(mode: GroupMode) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, mode);
}

export function groupPreset(mode: GroupMode): GroupPreset {
  return GROUP_PRESETS.find((p) => p.id === mode) ?? GROUP_PRESETS[0];
}
