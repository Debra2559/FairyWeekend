import type { CSSProperties } from "react";
import type { JourneyScene, SceneRecord } from "@/lib/persona-types";
import { VenueIcon, detectVenue } from "./VenueIcon";

interface Props {
  scenes: JourneyScene[];
  records: Record<number, SceneRecord>;
  completed: number[];
  onPick: (s: JourneyScene) => void;
  createdAt: number;
}

const CN_NUM = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
function chineseNum(n: number) {
  if (n <= 12) return CN_NUM[n];
  return String(n);
}

function fmtTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function fmtDuration(fromTs: number, toTs: number) {
  const ms = Math.max(0, toTs - fromTs);
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} 分钟`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** 截出悬念文案（未解锁时引诱打卡） */
function teaser(text: string) {
  if (!text) return "";
  const t = text.trim();
  const limit = 18;
  return t.length > limit ? t.slice(0, limit) + "…" : t;
}

/** 用户记录摘要（已解锁时展示） */
function diaryLine(rec: SceneRecord | undefined, fallback: string) {
  if (rec?.note) return rec.note;
  return teaser(fallback);
}

export function JourneyDiary({
  scenes,
  records,
  completed,
  onPick,
  createdAt,
}: Props) {
  const total = scenes.length;
  const doneCount = completed.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const doneRecords = scenes
    .filter((s) => completed.includes(s.order))
    .map((s) => records[s.order])
    .filter(Boolean) as SceneRecord[];
  const times = doneRecords.map((r) => r.completedAt).filter(Boolean) as number[];
  const earliest = times.length ? Math.min(...times) : 0;
  const latest = times.length ? Math.max(...times) : 0;
  const elapsed = times.length >= 2 ? fmtDuration(earliest, latest) : times.length === 1 ? "刚开篇" : "未开篇";
  const moodEmoji = doneRecords.map((r) => r.mood).filter(Boolean).slice(-1)[0] ?? "✶";

  const dateLabel = new Date(createdAt || Date.now()).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <section className="px-5">
      {/* Header */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="display italic text-[10px] tracking-[0.32em] text-[var(--ink-soft)]">
            TODAY&apos;S DIARY · 今日连载
          </div>
          <div className="cn-serif text-[13px] text-[var(--ink)] mt-0.5">
            {dateLabel}
            <span className="display italic text-[11px] text-[var(--ink-soft)] ml-2">
              · 共 {chineseNum(total)} 话
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="cn-serif text-[20px] leading-none text-[var(--ink)]">
            <span className="font-medium">{doneCount}</span>
            <span className="display italic text-[12px] text-[var(--ink-soft)] mx-1">/</span>
            <span className="display italic text-[14px] text-[var(--ink-soft)]">{total}</span>
          </div>
          <div className="display italic text-[10px] tracking-[0.2em] text-[var(--ink-soft)] mt-0.5">
            CHAPTERS
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="relative h-[3px] rounded-full bg-[var(--ink)]/8 overflow-hidden mb-4">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #c4a56c 0%, #8a6d4f 100%)",
          }}
        />
      </div>

      {/* 故事节点 + Polaroid 统一滚动 */}
      <div
        className="-mx-5 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as CSSProperties}
      >
        <div className="px-5 inline-flex flex-col gap-2">
          {/* 节点标记行 */}
          <div className="flex items-center gap-3">
            {scenes.map((s) => {
              const done = completed.includes(s.order);
              return (
                <button
                  key={`trail-${s.order}`}
                  onClick={() => onPick(s)}
                  className="shrink-0 flex justify-center"
                  style={{ width: 136 }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center cn-serif text-[9px] transition-all duration-300 hover:scale-110"
                    style={{
                      background: done ? "#c4a56c" : "#f4ecdd",
                      color: done ? "#fff" : "var(--ink-soft)",
                      border: done ? "1.5px solid #c4a56c" : "1.5px dashed rgba(60,40,30,0.25)",
                      boxShadow: done ? "0 2px 5px rgba(196,165,108,0.3)" : "none",
                    }}
                  >
                    {done ? "✓" : s.order}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Polaroid strip */}
          <ol className="flex gap-3 pb-3">
            {scenes.map((s, idx) => {
              const rec = records[s.order];
              const done = completed.includes(s.order);
              const photo = rec?.photos?.[0] ?? rec?.photo;
              const kind = detectVenue(s.location_type, s.location_name);
              const rotation = (idx % 2 === 0 ? -1 : 1) * (1.2 + (idx % 3) * 0.4);
              const line = diaryLine(rec, s.persona_narrative);

              return (
                <li key={s.order} className="shrink-0">
                  <button
                    onClick={() => onPick(s)}
                    className="block text-left transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
                    style={{ transform: `rotate(${rotation}deg)` }}
                    aria-label={`第 ${s.order} 话 · ${s.scene_name}`}
                  >
                    <div
                      className="relative w-[136px] rounded-[6px] p-2 pb-3"
                      style={{
                        background: done ? "#fffdf7" : "#f4ecdd",
                        boxShadow: done
                          ? "0 1px 0 rgba(0,0,0,0.04), 0 10px 22px -14px rgba(60,40,30,0.35)"
                          : "0 1px 0 rgba(0,0,0,0.03), 0 6px 14px -12px rgba(60,40,30,0.18)",
                        border: done ? "1px solid rgba(60,40,30,0.08)" : "1px dashed rgba(60,40,30,0.22)",
                      }}
                    >
                      {/* tape */}
                      <div
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-10 h-3 rounded-[2px]"
                        style={{
                          background: done
                            ? "linear-gradient(180deg, rgba(196,165,108,0.7), rgba(196,165,108,0.45))"
                            : "linear-gradient(180deg, rgba(120,100,80,0.18), rgba(120,100,80,0.08))",
                          boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
                        }}
                      />

                      {/* image / placeholder */}
                      <div
                        className="relative w-full aspect-square rounded-[3px] overflow-hidden flex items-center justify-center"
                        style={{
                          background: done
                            ? "#1a1a1a"
                            : "repeating-linear-gradient(45deg, #ece3d0 0 6px, #e6dcc6 6px 12px)",
                        }}
                      >
                        {done && photo ? (
                          <img
                            src={photo}
                            alt={s.scene_name}
                            className="w-full h-full object-cover"
                          />
                        ) : done ? (
                          <div className="text-white/85 flex flex-col items-center gap-1">
                            <VenueIcon kind={kind} size={40} className="opacity-90" />
                            <span className="display italic text-[10px] tracking-[0.18em] text-white/70">
                              RECORDED
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-[var(--ink-soft)]/70">
                            <VenueIcon kind={kind} size={36} className="opacity-50" />
                            <span className="display italic text-[9.5px] tracking-[0.22em]">
                              UNSEALED
                            </span>
                          </div>
                        )}

                        {/* stamp */}
                        {done && (
                          <div
                            className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-sm"
                            style={{
                              background: "rgba(199, 71, 51, 0.92)",
                              color: "#fff8ec",
                              fontFamily: "var(--font-display, serif)",
                              fontSize: "8.5px",
                              letterSpacing: "0.12em",
                              border: "1px solid rgba(255,248,236,0.5)",
                              transform: `rotate(${6 + (idx % 3) * 4}deg)`,
                            }}
                          >
                            ✓ DONE
                          </div>
                        )}

                        {!done && (
                          <div
                            className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center cn-serif text-[10px]"
                            style={{
                              background: "rgba(60,40,30,0.06)",
                              color: "var(--ink-soft)",
                              border: "1px dashed rgba(60,40,30,0.25)",
                            }}
                          >
                            {s.order}
                          </div>
                        )}
                      </div>

                      {/* caption */}
                      <div className="mt-2 px-0.5">
                        <div className="flex items-center justify-between">
                          <span className="display italic text-[9.5px] tracking-[0.2em] text-[var(--ink-soft)]">
                            CH.{String(s.order).padStart(2, "0")}
                          </span>
                          <span className="display italic text-[9.5px] text-[var(--ink-soft)]/80">
                            {done ? fmtTime(rec?.completedAt) : `~${s.stay_minutes}m`}
                          </span>
                        </div>
                        <div
                          className="cn-serif text-[12px] text-[var(--ink)] mt-0.5 leading-tight overflow-hidden"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            minHeight: "30px",
                          }}
                        >
                          {s.scene_name}
                        </div>

                        {/* 叙事 / 悬念文案 */}
                        {line && (
                          <div className="mt-1.5 pt-1.5 border-t border-dashed border-[var(--ink)]/10">
                            <div
                              className={`cn-serif text-[10px] leading-relaxed overflow-hidden ${
                                done ? "text-[var(--ink-soft)]" : "text-[var(--ink-soft)]/70"
                              }`}
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {done ? `「${line}」` : `下一话：${line}`}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="mt-1 px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-2"
        style={{
          background: "rgba(255,253,247,0.65)",
          border: "1px solid rgba(60,40,30,0.08)",
          backdropFilter: "blur(4px)",
        }}
      >
        <Stat label="已记录" value={`${doneCount}`} suffix="话" />
        <Divider />
        <Stat label="今日用时" value={elapsed} />
        <Divider />
        <Stat label="心情" value={moodEmoji} />
        <Divider />
        <Stat
          label="距结语"
          value={doneCount >= total ? "已解锁" : `${total - doneCount}`}
          suffix={doneCount >= total ? "" : "话"}
          accent={doneCount >= total}
        />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex-1 min-w-0 text-center">
      <div className="display italic text-[9px] tracking-[0.2em] text-[var(--ink-soft)] truncate">
        {label}
      </div>
      <div
        className={`cn-serif text-[13px] mt-0.5 leading-tight truncate ${
          accent ? "text-[#a85a3b] font-medium" : "text-[var(--ink)]"
        }`}
      >
        {value}
        {suffix && (
          <span className="display italic text-[10px] text-[var(--ink-soft)] ml-0.5">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-7 bg-[var(--ink)]/10 shrink-0" />;
}
