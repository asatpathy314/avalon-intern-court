"use client";

import type { TvView } from "@/lib/views";
import { useNow } from "./TvApp";
import { QuestTrack, Candles } from "./RoundTable";

/** TV-5 · cards fly in face-down, visibly shuffle, flip one at a time on a 1.2s beat. */
export function QuestReveal({ v, clockOffset }: { v: TvView; clockOffset: number }) {
  const now = useNow(true, 80);
  const r = v.questReveal!;
  const t = now + clockOffset - r.revealAt;
  const shuffling = t >= 700 && t < 1500;
  const flippedCount = t < 1600 ? 0 : Math.min(r.cards.length, Math.floor((t - 1600) / 1200) + 1);
  const allFlipped = flippedCount >= r.cards.length;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <QuestTrack v={v} />
      <Candles v={v} />
      <div
        className="serif"
        style={{
          position: "absolute",
          top: 230,
          left: 0,
          right: 0,
          textAlign: "center",
          font: "600 60px var(--font-serif)",
        }}
      >
        Mission {v.mission + 1} — the cards are cast
      </div>
      <div
        style={{
          position: "absolute",
          top: 380,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 40,
        }}
      >
        {r.cards.map((card, i) => {
          const success = card === "success";
          const flipped = i < flippedCount;
          return (
            <div
              key={i}
              className={`card-fly${shuffling ? " shuffling" : ""}`}
              style={{ animationDelay: shuffling ? `${i * 60}ms` : `${i * 100}ms` }}
            >
              <div className="flip-card" style={{ width: 190, height: 270 }}>
                <div className={`flip-inner${flipped ? " flipped" : ""}`}>
                  <div
                    className="flip-face"
                    style={
                      success
                        ? { background: "var(--good-fill)", border: "2px solid var(--good-border)" }
                        : {
                            background: "var(--evil-fill)",
                            border: "2px solid var(--evil-border)",
                            boxShadow: "0 0 46px rgba(102,48,47,0.8)",
                          }
                    }
                  >
                    <span style={{ fontSize: 50 }}>{success ? "◯" : "◆"}</span>
                    <span style={{ font: "600 24px var(--font-body)", letterSpacing: "0.08em" }}>
                      {success ? "SUCCESS" : "FAIL"}
                    </span>
                  </div>
                  <div
                    className="flip-face flip-back"
                    style={{
                      background: "linear-gradient(135deg, #191d33, #10131f)",
                      border: "1px solid rgba(201,162,75,0.8)",
                      boxShadow: "0 0 24px rgba(201,162,75,0.35)",
                    }}
                  >
                    <span className="serif" style={{ font: "700 56px var(--font-serif)", color: "var(--gold)" }}>
                      ✦
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 130,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        {allFlipped ? (
          <div
            className="serif stamp-in"
            style={{
              font: "700 76px var(--font-serif)",
              color: r.success ? "var(--good-text)" : "var(--evil-text)",
            }}
          >
            {r.success
              ? `◯ Mission ${v.mission + 1} succeeds`
              : `◆ Mission ${v.mission + 1} fails${r.fails > 1 ? ` — ${r.fails} blades` : ""}`}
          </div>
        ) : (
          <div style={{ font: "400 28px var(--font-body)", color: "var(--parchment-55)" }}>
            {flippedCount === 0
              ? "the cards shuffle…"
              : r.cards.length - flippedCount === 1
                ? "one card remains…"
                : "the cards turn…"}
          </div>
        )}
      </div>
    </div>
  );
}
