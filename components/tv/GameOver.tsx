"use client";

import { useEffect, useState } from "react";
import type { TvView } from "@/lib/views";
import { ROLES, PORTRAITS } from "@/lib/roles";
import { LQIP } from "@/lib/lqip";

/** TV-7 · every name finally paired with its plate, all flipping at once. */
export function GameOver({
  v,
  act,
}: {
  v: TvView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  const g = v.gameover!;
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 900);
    return () => clearTimeout(t);
  }, []);
  const good = g.winner === "good";
  const w = g.cast.length > 8 ? 190 : 216;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        className="serif"
        style={{
          position: "absolute",
          top: 52,
          left: 0,
          right: 0,
          textAlign: "center",
          font: "700 68px var(--font-serif)",
          color: "var(--gold)",
        }}
      >
        The court unmasked
      </div>
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 0,
          right: 0,
          textAlign: "center",
          font: "400 30px var(--font-body)",
          color: good ? "var(--good-text)" : "var(--evil-text)",
        }}
      >
        {good ? "◯" : "◆"} {g.winReason}
      </div>
      <div
        style={{
          position: "absolute",
          top: 230,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 28,
        }}
      >
        {g.cast.map(({ name, role }) => {
          const info = ROLES[role];
          const evil = info.allegiance === "evil";
          return (
            <div key={name} style={{ width: w, textAlign: "center" }}>
              <div className="flip-card" style={{ width: w * 0.78, height: w * 0.78, margin: "0 auto" }}>
                <div className={`flip-inner${flipped ? " flipped" : ""}`}>
                  <div className="flip-face">
                    <img
                      src={PORTRAITS[role]}
                      alt={info.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        border: "1px solid rgba(201,162,75,0.6)",
                        backgroundImage: `url(${LQIP[role]})`,
                        backgroundSize: "cover",
                      }}
                    />
                  </div>
                  <div
                    className="flip-face flip-back"
                    style={{
                      background: "linear-gradient(135deg, #191d33, #10131f)",
                      border: "1px solid rgba(201,162,75,0.8)",
                    }}
                  >
                    <span className="serif" style={{ font: "700 48px var(--font-serif)", color: "var(--gold)" }}>✦</span>
                  </div>
                </div>
              </div>
              <div style={{ font: "600 28px var(--font-body)", marginTop: 12 }}>{name}</div>
              <div
                className="serif"
                style={{
                  font: "600 30px var(--font-serif)",
                  color: evil ? "var(--evil-text)" : "var(--good-text)",
                }}
              >
                {evil ? "◆" : "◯"} {info.shortName}
              </div>
            </div>
          );
        })}
      </div>
      {/* quest-by-quest recap — the only place vote history ever appears */}
      <div
        style={{
          position: "absolute",
          bottom: 170,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 68,
          font: "400 26px var(--font-body)",
          color: "rgba(237,230,214,0.65)",
        }}
      >
        {[0, 1, 2, 3, 4].map((m) => {
          const rec = g.recap.find((h) => h.mission === m);
          if (!rec)
            return (
              <span key={m} style={{ color: "rgba(237,230,214,0.35)" }}>
                M{m + 1} —
              </span>
            );
          return (
            <span key={m}>
              M{m + 1} {rec.success ? "◯" : `◆ fail ×${rec.fails}`} ·{" "}
              {rec.unopposed ? "unopposed" : `approved ${rec.approve}–${rec.reject}`}
            </span>
          );
        })}
      </div>
      <div style={{ position: "absolute", bottom: 56, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <button
          className="btn-gold"
          style={{ width: 480, fontSize: 26, padding: 18 }}
          onClick={() => act("playAgain")}
        >
          Convene again — same court
        </button>
      </div>
    </div>
  );
}
