import type { ArchivedChapter } from "@/lib/persona-store";

export function PrintableSeries({ chapters }: { chapters: ArchivedChapter[] }) {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.4em",
            color: "#8a7a6a",
          }}
        >
          TODAYPERSONA · MY SERIAL TALE
        </div>
        <h1 style={{ fontSize: 36, margin: "12px 0 6px", color: "#6f5850" }}>我的连载</h1>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 13,
            color: "#8a7a6a",
          }}
        >
          A Serial Tale of Selves · 共 {chapters.length} 章
        </div>
        <div style={{ marginTop: 18, fontSize: 12, color: "#8a7a6a" }}>
          导出于 {new Date().toLocaleString("zh-CN")}
        </div>
      </div>
      {chapters.map((ch, idx) => (
        <div key={ch.chapterId} style={{ marginBottom: 56, pageBreakAfter: "always" }}>
          <PrintableChapter ch={ch} chapterNo={chapters.length - idx} />
        </div>
      ))}
    </div>
  );
}

export function PrintableChapter({ ch, chapterNo }: { ch: ArchivedChapter; chapterNo: number }) {
  const date = new Date(ch.createdAt);
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  const total = ch.journey.scenes.length;
  const done = ch.completedSceneOrders.length;
  const enhanced = Object.values(ch.sceneRecords ?? {}).filter((r) => r.note || r.photo).length;

  return (
    <article style={{ lineHeight: 1.85 }}>
      <div
        style={{
          height: 200,
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
          background: `linear-gradient(135deg, ${ch.card.colors[0]}, ${ch.card.colors[1]})`,
          marginBottom: 20,
        }}
      >
        {ch.card.cover && (
          <img
            src={ch.card.cover}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            crossOrigin="anonymous"
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent 60%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 16,
            right: 16,
            display: "flex",
            justifyContent: "space-between",
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.25em",
          }}
        >
          <span>✦ {ch.card.rarity}</span>
          <span>CH.{String(chapterNo).padStart(2, "0")}</span>
        </div>
        <div style={{ position: "absolute", bottom: 16, left: 18, right: 18, color: "#fff" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 12,
              opacity: 0.85,
            }}
          >
            {dateStr} {ch.city && `· ${ch.city}`}
          </div>
          <div style={{ fontSize: 20, marginTop: 4 }}>「{ch.card.identity}」</div>
          <div style={{ fontSize: 13, fontStyle: "italic", opacity: 0.9, marginTop: 2 }}>
            {ch.card.mood}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 12,
          color: "#8a7a6a",
          marginBottom: 18,
          fontFamily: "var(--font-display)",
          letterSpacing: "0.18em",
        }}
      >
        <span>
          SCENES {done}/{total}
        </span>
        <span>ENHANCE {enhanced}</span>
        <span>
          {ch.journey.emotion_arc.start} → {ch.journey.emotion_arc.end}
        </span>
      </div>

      <SectionLabel>序章 · OPENING</SectionLabel>
      <p style={{ fontSize: 14, marginTop: 6 }}>{ch.journey.story_opening}</p>

      <SectionLabel style={{ marginTop: 22 }}>TIMELINE · 逐场景</SectionLabel>
      <ol style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
        {ch.journey.scenes.map((s) => {
          const rec = ch.sceneRecords?.[s.order];
          const isDone = ch.completedSceneOrders.includes(s.order);
          const t = rec?.completedAt ? new Date(rec.completedAt) : null;
          const timeStr = t
            ? `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`
            : "未点亮";
          return (
            <li
              key={s.order}
              style={{
                borderLeft: `2px solid ${isDone ? "#c89a5a" : "#e5dccf"}`,
                paddingLeft: 16,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 14 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: 11,
                      color: "#8a7a6a",
                      marginRight: 6,
                    }}
                  >
                    § {s.order}
                  </span>
                  {s.scene_name} {rec?.mood && <span style={{ marginLeft: 4 }}>{rec.mood}</span>}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#8a7a6a",
                  }}
                >
                  {timeStr}
                </span>
              </div>
              <p style={{ fontSize: 13, margin: "4px 0" }}>{s.persona_narrative}</p>
              <div style={{ fontSize: 11, color: "#8a7a6a" }}>
                @ {s.location_name} · {s.action_task}
              </div>
              {rec?.photo && (
                <img
                  src={rec.photo}
                  alt=""
                  style={{
                    marginTop: 8,
                    maxWidth: "100%",
                    maxHeight: 240,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #e5dccf",
                  }}
                  crossOrigin="anonymous"
                />
              )}
              {rec?.note && (
                <blockquote
                  style={{
                    margin: "8px 0 0",
                    paddingLeft: 12,
                    borderLeft: "2px solid rgba(200,154,90,0.5)",
                    fontStyle: "italic",
                    fontSize: 13,
                  }}
                >
                  "{rec.note}"
                </blockquote>
              )}
            </li>
          );
        })}
      </ol>

      <SectionLabel style={{ marginTop: 22 }}>终章 · CLOSING</SectionLabel>
      <p style={{ fontSize: 14, marginTop: 6 }}>{ch.journey.closing}</p>
    </article>
  );
}

export function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 10,
        letterSpacing: "0.3em",
        color: "#8a7a6a",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
