"use client";

import { useState } from "react";
import type { PlayerView } from "@/lib/views";

export function AssassinScreen({
  v,
  act,
}: {
  v: PlayerView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  const [marked, setMarked] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const targets = v.assassin?.targets ?? [];
  const markedName = targets.find((t) => t.id === marked)?.name;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 14 }}>
      <div
        className="serif"
        style={{ font: "700 28px var(--font-serif)", color: "var(--gold)", textAlign: "center" }}
      >
        Name Merlin
      </div>
      <div
        style={{
          font: "400 12px var(--font-body)",
          color: "var(--parchment-55)",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        strike true and Mordred takes the game
      </div>
      <div style={{ display: "grid", gap: 8, overflowY: "auto" }}>
        {targets.map((t) => (
          <button
            key={t.id}
            className={`row-pick${marked === t.id ? " picked" : ""}`}
            style={marked === t.id ? { borderWidth: 2, fontWeight: 600 } : undefined}
            onClick={() => setMarked((cur) => (cur === t.id ? null : t.id))}
          >
            <span>{t.name}</span>
            {marked === t.id && <span style={{ color: "var(--gold)" }}>✕ marked</span>}
          </button>
        ))}
      </div>
      <button
        className="btn-gold"
        style={{ marginTop: "auto" }}
        disabled={!marked}
        onClick={() => setConfirming(true)}
      >
        Raise the blade
      </button>
      {confirming && marked && (
        <div className="pause-overlay" style={{ background: "rgba(7,8,15,0.94)" }}>
          <div className="serif" style={{ font: "600 26px var(--font-serif)" }}>
            Strike {markedName}?
          </div>
          <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-55)" }}>
            This ends the game.
          </div>
          <button
            className="btn-gold"
            style={{ maxWidth: 280 }}
            onClick={async () => {
              await act("assassinate", { targetId: marked });
              setConfirming(false);
            }}
          >
            ✕ Strike {markedName}
          </button>
          <button className="btn-ghost" style={{ maxWidth: 280 }} onClick={() => setConfirming(false)}>
            Stay the blade
          </button>
        </div>
      )}
    </div>
  );
}
