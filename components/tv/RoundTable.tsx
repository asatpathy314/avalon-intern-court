"use client";

import type { TvView } from "@/lib/views";
import { Crest } from "@/components/Crest";

/** Quest track: resolved ◯/◆, current ringed gold, two-fail double-ringed. */
export function QuestTrack({ v }: { v: TvView }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 44,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        gap: 36,
        alignItems: "center",
      }}
    >
      {v.missionSizes.map((size, i) => {
        const res = v.questResults[i];
        const current = i === v.mission && !res;
        const twoFail = i === v.twoFailIndex;
        if (res && !res.success) {
          return (
            <div
              key={i}
              style={{
                width: 88,
                height: 88,
                background: "var(--evil)",
                border: "4px solid var(--gold)",
                transform: "rotate(45deg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ transform: "rotate(-45deg)", font: "700 32px var(--font-body)" }}>✕</span>
            </div>
          );
        }
        return (
          <div
            key={i}
            className="serif"
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: res?.success ? "var(--good)" : undefined,
              border: res?.success
                ? "4px solid var(--gold)"
                : current
                  ? "4px solid rgba(201,162,75,0.9)"
                  : "4px solid rgba(201,162,75,0.35)",
              boxShadow: current
                ? "0 0 36px rgba(201,162,75,0.35)"
                : twoFail && !res
                  ? "0 0 0 6px var(--ground), 0 0 0 8px rgba(201,162,75,0.3)"
                  : undefined,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              font: "700 36px var(--font-serif)",
              color: res?.success ? "var(--parchment)" : current ? "var(--gold)" : "rgba(237,230,214,0.5)",
              position: "relative",
            }}
          >
            {res?.success ? "◯" : size}
            {twoFail && !res && (
              <span
                style={{
                  position: "absolute",
                  bottom: -32,
                  font: "600 16px var(--font-body)",
                  letterSpacing: "0.08em",
                  color: "rgba(201,162,75,0.7)",
                  whiteSpace: "nowrap",
                }}
              >
                2 FAILS
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Five candles top-right; one snuffs per rejected proposal. */
export function Candles({ v }: { v: TvView }) {
  return (
    <div style={{ position: "absolute", top: 60, right: 80, display: "flex", gap: 16, alignItems: "flex-end" }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const lit = i >= v.rejections;
        return (
          <div
            key={i}
            style={{
              width: 14,
              height: 40,
              background: lit ? "rgba(237,230,214,0.85)" : "rgba(237,230,214,0.25)",
              position: "relative",
            }}
          >
            {lit && (
              <span
                className="flame"
                style={{
                  position: "absolute",
                  top: -16,
                  left: 1,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "var(--gold)",
                }}
              />
            )}
          </div>
        );
      })}
      <span
        style={{
          font: "600 18px var(--font-body)",
          letterSpacing: "0.1em",
          color: "rgba(237,230,214,0.5)",
          marginLeft: 12,
          alignSelf: "center",
        }}
      >
        REJECTIONS
      </span>
    </div>
  );
}

/** TV-3 · the persistent round table. */
export function RoundTable({ v }: { v: TvView }) {
  const players = [...v.players].sort((a, b) => a.seat - b.seat);
  const n = players.length;
  const cx = 960;
  const cy = 590;
  const rx = 430;
  const ry = 300;

  const banner = () => {
    if (v.phase === "proposal") {
      return (
        <>
          <span style={{ color: "var(--gold)" }}>{v.leaderName}</span> chooses{" "}
          {v.missionSizes[v.mission]} for Mission {v.mission + 1}…
        </>
      );
    }
    if (v.phase === "voting") {
      const list = v.proposalNames;
      const names = list.length === 2 ? list.join(" and ") : list.join(", ");
      return (
        <>
          {v.leaderName} proposes <span style={{ color: "var(--gold)" }}>{names}</span> for
          Mission {v.mission + 1} — the court votes
        </>
      );
    }
    if (v.phase === "quest") {
      const list = v.quest?.teamNames ?? [];
      const names = list.length === 2 ? list.join(" and ") : list.join(", ");
      return (
        <>
          <span style={{ color: "var(--gold)" }}>{names}</span> ride for Mission {v.mission + 1}{" "}
          · {v.quest?.cardsIn} of {v.quest?.cardsNeeded} cards cast
        </>
      );
    }
    return null;
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <QuestTrack v={v} />
      <Candles v={v} />
      <div
        style={{
          position: "absolute",
          left: cx - 340,
          top: cy - 245,
          width: 680,
          height: 490,
          border: "1px solid rgba(201,162,75,0.2)",
          borderRadius: "50%",
        }}
      />
      {players.map((p, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const x = cx + rx * Math.cos(angle);
        const y = cy + ry * Math.sin(angle);
        const isLeader = p.id === v.leaderId;
        const chosen = v.proposalIds.includes(p.id);
        const voted = v.votedIds.includes(p.id);
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              zIndex: 2,
              opacity: p.connected ? 1 : 0.45,
            }}
          >
            {isLeader && (
              <div className="flame" style={{ fontSize: 34, color: "var(--gold)", lineHeight: 1.1 }}>
                ♛
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, position: "relative" }}>
              <Crest name={p.name} size={72} lifted={chosen} />
              {voted && (
                <div
                  className="rise-in"
                  style={{
                    position: "absolute",
                    right: -30,
                    bottom: -6,
                    width: 40,
                    height: 54,
                    background: "linear-gradient(135deg, #191d33, #10131f)",
                    border: "1px solid rgba(201,162,75,0.8)",
                    boxShadow: "0 0 16px rgba(201,162,75,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span className="serif" style={{ font: "700 20px var(--font-serif)", color: "var(--gold)" }}>✦</span>
                </div>
              )}
            </div>
            <div
              style={{
                font: "600 26px var(--font-body)",
                color: chosen || isLeader ? "var(--gold)" : "var(--parchment)",
              }}
            >
              {p.name}
            </div>
            {!p.connected && (
              <div style={{ font: "500 16px var(--font-body)", color: "var(--evil-text)" }}>
                adrift
              </div>
            )}
          </div>
        );
      })}
      <div
        className="serif"
        style={{
          position: "absolute",
          bottom: 52,
          left: 0,
          right: 0,
          textAlign: "center",
          font: "600 52px var(--font-serif)",
        }}
      >
        {banner()}
      </div>
    </div>
  );
}
