"use client";

import { useState } from "react";
import type { TvView } from "@/lib/views";
import type { RoleKey } from "@/lib/types";
import { ROLES } from "@/lib/roles";
import { defaultSpecials, evilCount, isEvil, twoFailMission } from "@/lib/rules";

function advisory(v: TvView): string {
  const n = v.playerCount;
  const off = (r: RoleKey) => v.config.disabled.includes(r);
  if (off("merlin")) return "Without Merlin the court plays blind — and no blade falls at the end.";
  if (!v.config.assassination)
    return "The blade is sheathed: three quests alone decide it, and Merlin may steer openly.";
  if (!off("mordred") && !off("morgana") && n === 7)
    return "Mordred and Morgana together at 7 is punishing for Good. Consider resting Mordred for a first game.";
  if (off("mistress") && !off("morgana"))
    return "Morgana with no Mistress to fool is a wasted mask. Consider resting her too.";
  if (off("morgana") && !off("mistress"))
    return "Without Morgana, the Mistress sees her Merlin plainly. Good grows strong.";
  if (off("mordred")) return "With Mordred resting, Merlin sees every evil face. Kind to new courts.";
  return "The court is balanced as the old laws prescribe.";
}

export function TvSetup({
  v,
  act,
}: {
  v: TvView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  const [customize, setCustomize] = useState(false);
  const n = v.playerCount;
  const evil = evilCount(n);
  const good = n - evil;
  const specials = defaultSpecials(n);
  const twoFail = twoFailMission(n);
  const disabled = v.config.disabled;

  const goodSpecials = specials.filter((r) => !isEvil(r));
  const evilSpecials = specials.filter((r) => isEvil(r));
  const servantCount = good - goodSpecials.filter((r) => !disabled.includes(r)).length;
  const minionCount = evil - evilSpecials.filter((r) => !disabled.includes(r)).length;

  const toggle = (r: RoleKey) => {
    const next = disabled.includes(r) ? disabled.filter((x) => x !== r) : [...disabled, r];
    act("updateConfig", { config: { disabled: next } });
  };

  const flagChoices = evilSpecials.filter((r) => !disabled.includes(r));

  const roleRow = (r: RoleKey) => {
    const off = disabled.includes(r);
    return (
      <div key={r} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ opacity: off ? 0.45 : 1 }}>
          {ROLES[r].sigil} {ROLES[r].name}
          {v.config.assassination && v.config.assassinFlag === r && !off && flagChoices.length > 0 && (
            <span style={{ color: "var(--evil-text)", font: "600 20px var(--font-body)", marginLeft: 10 }}>
              ✕ carries the blade
            </span>
          )}
        </span>
        <button
          onClick={() => toggle(r)}
          style={
            off
              ? {
                  font: "600 20px var(--font-body)",
                  letterSpacing: "0.1em",
                  color: "rgba(237,230,214,0.6)",
                  border: "1px solid rgba(237,230,214,0.3)",
                  padding: "5px 16px",
                }
              : {
                  font: "600 20px var(--font-body)",
                  letterSpacing: "0.1em",
                  color: "var(--ground)",
                  background: "var(--gold)",
                  padding: "6px 18px",
                }
          }
        >
          {off ? "RESTING" : "IN PLAY"}
        </button>
      </div>
    );
  };

  const fillRow = (label: string, count: number) =>
    count > 0 ? (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{label} ×{count}</span>
        <span
          style={{
            font: "600 20px var(--font-body)",
            letterSpacing: "0.1em",
            color: "rgba(237,230,214,0.6)",
            border: "1px solid rgba(237,230,214,0.3)",
            padding: "4px 14px",
          }}
        >
          FILLS {label.includes("Servant") ? "GOOD" : "EVIL"}
        </span>
      </div>
    ) : null;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 80 }}>
      <div style={{ width: 800, background: "var(--surface)", border: "1px solid rgba(201,162,75,0.5)", padding: 48 }}>
        <div className="serif" style={{ font: "700 60px var(--font-serif)", color: "var(--gold)", marginBottom: 8 }}>
          Court Setup — {n} players
        </div>
        <div
          style={{
            display: "inline-flex",
            gap: 16,
            alignItems: "center",
            font: "600 24px var(--font-body)",
            letterSpacing: "0.08em",
            background: "rgba(237,230,214,0.08)",
            padding: "10px 20px",
            marginBottom: 28,
          }}
        >
          <span style={{ color: "var(--good-text)" }}>◯ {good} GOOD</span>
          <span style={{ color: "rgba(237,230,214,0.4)" }}>·</span>
          <span style={{ color: "var(--evil-text)" }}>◆ {evil} EVIL</span>
          <span style={{ color: "rgba(237,230,214,0.5)" }}>— ratio locked by the rules</span>
        </div>
        <div style={{ display: "grid", gap: 14, font: "500 28px var(--font-body)" }}>
          {goodSpecials.map(roleRow)}
          {fillRow("Servant", servantCount)}
          {evilSpecials.map(roleRow)}
          {fillRow("Minion", minionCount)}
        </div>
        <div
          className="serif"
          style={{
            fontStyle: "italic",
            font: "italic 400 28px/1.45 var(--font-serif)",
            color: "var(--parchment-75)",
            borderTop: "1px solid rgba(237,230,214,0.15)",
            marginTop: 28,
            paddingTop: 20,
          }}
        >
          {advisory(v)}
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 32 }}>
          <button className="btn-gold" style={{ flex: 1, fontSize: 28, padding: 20 }} onClick={() => act("beginCourt")}>
            Begin the court
          </button>
          <button className="btn-ghost" style={{ flex: 1, fontSize: 28, padding: 20 }} onClick={() => setCustomize((c) => !c)}>
            {customize ? "Close" : "Customize"}
          </button>
        </div>
        <button
          onClick={() => act("backToLobby")}
          style={{ marginTop: 18, font: "500 20px var(--font-body)", letterSpacing: "0.08em", color: "var(--parchment-55)" }}
        >
          ← BACK TO THE GATES
        </button>
      </div>

      <div style={{ width: 620 }}>
        <div style={{ font: "600 24px var(--font-body)", letterSpacing: "0.18em", color: "rgba(237,230,214,0.5)", marginBottom: 20 }}>
          MISSIONS AT {n} PLAYERS
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {v.missionSizes.map((size, i) => (
            <div
              key={i}
              style={{
                width: 92,
                height: 92,
                border: i === twoFail ? "4px solid var(--gold)" : "4px solid rgba(201,162,75,0.6)",
                boxShadow: i === twoFail ? "0 0 0 6px var(--surface), 0 0 0 8px rgba(201,162,75,0.5)" : undefined,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "700 40px var(--font-serif)",
                position: "relative",
              }}
              className="serif"
            >
              {size}
              {i === twoFail && (
                <span
                  style={{
                    position: "absolute",
                    bottom: -40,
                    font: "600 18px var(--font-body)",
                    letterSpacing: "0.08em",
                    color: "var(--gold)",
                    whiteSpace: "nowrap",
                  }}
                >
                  2 FAILS
                </span>
              )}
            </div>
          ))}
        </div>

        {customize ? (
          <div style={{ marginTop: 70, display: "grid", gap: 18, font: "500 24px var(--font-body)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Rejection rule</span>
              <button
                onClick={() =>
                  act("updateConfig", {
                    config: {
                      rejectionVariant:
                        v.config.rejectionVariant === "official" ? "unopposed" : "official",
                    },
                  })
                }
                style={{
                  font: "600 20px var(--font-body)",
                  letterSpacing: "0.06em",
                  color: "var(--ground)",
                  background: "var(--gold)",
                  padding: "6px 16px",
                }}
              >
                {v.config.rejectionVariant === "official"
                  ? "5 REJECTIONS ⇒ EVIL WINS"
                  : "5TH LEADER PICKS UNOPPOSED"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Assassination</span>
              <button
                onClick={() =>
                  act("updateConfig", { config: { assassination: !v.config.assassination } })
                }
                style={
                  v.config.assassination
                    ? {
                        font: "600 20px var(--font-body)",
                        letterSpacing: "0.06em",
                        color: "var(--ground)",
                        background: "var(--gold)",
                        padding: "6px 16px",
                      }
                    : {
                        font: "600 20px var(--font-body)",
                        letterSpacing: "0.06em",
                        color: "rgba(237,230,214,0.6)",
                        border: "1px solid rgba(237,230,214,0.3)",
                        padding: "5px 15px",
                      }
                }
              >
                {v.config.assassination ? "✕ EVIL NAMES MERLIN AT THE END" : "OFF — QUESTS ALONE DECIDE"}
              </button>
            </div>
            {v.config.assassination && flagChoices.length > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Assassin&apos;s blade</span>
                <button
                  onClick={() => {
                    const i = flagChoices.indexOf(v.config.assassinFlag as RoleKey);
                    const next = flagChoices[(i + 1) % flagChoices.length];
                    act("updateConfig", { config: { assassinFlag: next } });
                  }}
                  style={{
                    font: "600 20px var(--font-body)",
                    letterSpacing: "0.06em",
                    color: "var(--ground)",
                    background: "var(--gold)",
                    padding: "6px 16px",
                  }}
                >
                  ✕ {ROLES[(flagChoices.includes(v.config.assassinFlag as RoleKey) ? v.config.assassinFlag : flagChoices[0]) as RoleKey].name.toUpperCase()}
                </button>
              </div>
            )}
            {["Discussion timers", "Lady of the Lake", "Excalibur"].map((label) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.4 }}>
                <span>{label}</span>
                <span style={{ font: "600 18px var(--font-body)", letterSpacing: "0.1em", border: "1px solid rgba(237,230,214,0.3)", padding: "4px 14px" }}>
                  v2
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ font: "400 26px/1.5 var(--font-body)", color: "rgba(237,230,214,0.55)", marginTop: 70 }}>
            Customize: rest any special role — its seat becomes a plain Servant or Minion. The
            assassin&apos;s blade may pass to any evil role in play, or be sheathed entirely so
            three quests alone decide the game. The last configuration persists for the next
            game.
          </div>
        )}
      </div>
    </div>
  );
}
