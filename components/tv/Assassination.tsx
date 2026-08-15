"use client";

import type { TvView } from "@/lib/views";
import { Crest } from "@/components/Crest";
import { Plate } from "@/components/Plate";
import { useNow } from "./TvApp";

/** TV-6 · the screen goes quiet: dim 40%, one candle-glow spotlight, no timer, no chatter. */
export function AssassinationQuiet({ v }: { v: TvView }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#07080f" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 58%, rgba(201,162,75,0.14) 0%, transparent 42%)",
        }}
        className="flame"
      />
      <div
        className="serif"
        style={{
          position: "absolute",
          top: 320,
          left: 0,
          right: 0,
          textAlign: "center",
          font: "600 72px var(--font-serif)",
          color: "var(--gold)",
        }}
      >
        Three quests won.
      </div>
      <div
        className="serif"
        style={{
          position: "absolute",
          top: 430,
          left: 0,
          right: 0,
          textAlign: "center",
          font: "italic 400 40px var(--font-serif)",
          color: "var(--parchment-75)",
        }}
      >
        The Assassin considers the court…
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 150,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 44,
          opacity: 0.5,
        }}
      >
        {[...v.players]
          .sort((a, b) => a.seat - b.seat)
          .map((p) => (
            <Crest key={p.id} name={p.name} size={56} />
          ))}
      </div>
    </div>
  );
}

/** The blade falls: Merlin's plate card-flips beside the accused name. */
export function AssassinationReveal({ v, clockOffset }: { v: TvView; clockOffset: number }) {
  const now = useNow(true, 80);
  const r = v.assassinReveal!;
  const t = now + clockOffset - r.revealAt;
  const flipped = t >= 1200;
  const verdict = t >= 2600;

  return (
    <div style={{ position: "absolute", inset: 0, background: "#07080f" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, rgba(201,162,75,0.14) 0%, transparent 46%)",
        }}
      />
      <div
        className="serif"
        style={{
          position: "absolute",
          top: 180,
          left: 0,
          right: 0,
          textAlign: "center",
          font: "600 64px var(--font-serif)",
        }}
      >
        The blade is raised against <span style={{ color: "var(--gold)" }}>{r.accusedName}</span>
      </div>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div className="flip-card" style={{ width: 300, height: 440 }}>
          <div className={`flip-inner${flipped ? " flipped" : ""}`}>
            <div className="flip-face" style={{ alignItems: "stretch" }}>
              <Plate role="merlin" width={300} showFlavor={false} />
            </div>
            <div
              className="flip-face flip-back"
              style={{
                background: "linear-gradient(135deg, #191d33, #10131f)",
                border: "1px solid rgba(201,162,75,0.8)",
                boxShadow: "0 0 40px rgba(201,162,75,0.3)",
              }}
            >
              <span className="serif" style={{ font: "700 90px var(--font-serif)", color: "var(--gold)" }}>✦</span>
            </div>
          </div>
        </div>
      </div>
      {verdict && (
        <div
          className="serif stamp-in"
          style={{
            position: "absolute",
            bottom: 140,
            left: 0,
            right: 0,
            textAlign: "center",
            font: "700 68px var(--font-serif)",
            color: r.hit ? "var(--evil-text)" : "var(--good-text)",
          }}
        >
          {r.hit
            ? `◆ ${r.accusedName} was Merlin. The blade lands.`
            : `◯ Merlin was ${r.merlinName}. The blade misses.`}
        </div>
      )}
    </div>
  );
}
