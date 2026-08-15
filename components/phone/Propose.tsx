"use client";

import { useState } from "react";
import type { PlayerView } from "@/lib/views";

export function ProposeScreen({
  v,
  act,
}: {
  v: PlayerView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [stamped, setStamped] = useState(false);
  const n = v.missionSizes[v.mission];
  const remaining = n - picked.length;

  const toggle = (id: string) => {
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < n ? [...cur, id] : cur
    );
  };

  const confirm = async () => {
    setStamped(true);
    const ok = await act("propose", { team: picked });
    if (!ok) setStamped(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 14 }}>
      <div className="serif" style={{ font: "600 24px var(--font-serif)", textAlign: "center" }}>
        Choose {n} for Mission {v.mission + 1}
      </div>
      <div
        style={{
          font: "400 12px var(--font-body)",
          color: "var(--parchment-55)",
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        {picked.length} of {n} chosen
        {v.rejectionVariant === "unopposed" && v.rejections >= 4
          ? " · the 5th proposal rides unopposed"
          : ""}
      </div>
      <div style={{ display: "grid", gap: 8, overflowY: "auto" }}>
        {[...v.players]
          .sort((a, b) => a.seat - b.seat)
          .map((p) => {
            const isPicked = picked.includes(p.id);
            return (
              <button
                key={p.id}
                className={`row-pick${isPicked ? " picked" : ""}`}
                onClick={() => toggle(p.id)}
              >
                <span>
                  {p.name}
                  {p.id === v.me.id ? " (you)" : ""}
                </span>
                <span style={{ color: isPicked ? "var(--gold)" : "rgba(237,230,214,0.3)" }}>
                  {isPicked ? "✦ chosen" : "○"}
                </span>
              </button>
            );
          })}
      </div>
      <button
        className={remaining === 0 ? `btn-gold${stamped ? " stamp-in" : ""}` : "btn-ghost"}
        style={{ marginTop: "auto", opacity: remaining === 0 ? 1 : 0.4 }}
        disabled={remaining !== 0 || stamped}
        onClick={confirm}
      >
        {remaining === 0
          ? "Propose this company"
          : `Propose — choose ${remaining} more`}
      </button>
    </div>
  );
}
