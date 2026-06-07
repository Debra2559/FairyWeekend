import { useEffect, useState } from "react";
import { GROUP_PRESETS, loadGroupMode, saveGroupMode, type GroupMode } from "@/lib/group-mode";

export function GroupModeSelector({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<GroupMode>("solo");

  useEffect(() => {
    setMode(loadGroupMode());
  }, []);

  function pick(m: GroupMode) {
    setMode(m);
    saveGroupMode(m);
  }

  return (
    <div className={`relative z-10 ${className}`}>
      <div className="text-center cn-serif text-[11px] tracking-[0.25em] text-[var(--ink-soft)] mb-2">
        今天和谁一起
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {GROUP_PRESETS.map((p) => {
          const active = mode === p.id;
          return (
            <button
              key={p.id}
              onClick={() => pick(p.id)}
              className={`px-3.5 py-1.5 rounded-full cn-serif text-[12.5px] border transition ${
                active
                  ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] shadow-sm"
                  : "bg-[var(--card)] text-[var(--ink-soft)] border-[var(--border)] hover:text-[var(--ink)]"
              }`}
              title={p.hint}
            >
              <span className="mr-1">{p.emoji}</span>{p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
