"use client";

import type { TvView } from "@/lib/views";
import type { RoleKey } from "@/lib/types";
import { Plate } from "@/components/Plate";
import { ROLE_ORDER } from "@/lib/roles";

/** Pre-game card: portraits only, no names — the court learns the faces of the roles. */
export function RolesInPlay({ v }: { v: TvView }) {
  const sworn = v.players.filter((p) => p.ready).length;
  const roles = [...v.rolesInPlay].sort(
    (a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b)
  );
  // shared portraits repeat — that's the joke landing
  const counted = new Map<RoleKey, number>();
  for (const r of roles) counted.set(r, (counted.get(r) ?? 0) + 1);
  const entries = [...counted.entries()];
  const width = entries.length > 6 ? 208 : 232;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div className="kicker" style={{ position: "absolute", top: 56, left: 0, right: 0, textAlign: "center" }}>
        The Intern Court
      </div>
      <div
        className="serif"
        style={{
          position: "absolute",
          top: 100,
          left: 0,
          right: 0,
          textAlign: "center",
          font: "700 64px var(--font-serif)",
          color: "var(--gold)",
        }}
      >
        Roles in play
      </div>
      <div
        style={{
          position: "absolute",
          top: 230,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "stretch",
          gap: 28,
        }}
      >
        {entries.map(([role, count]) => (
          <div key={role} className="rise-in" style={{ position: "relative" }}>
            <Plate role={role} width={width} />
            {count > 1 && (
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  right: -14,
                  background: "var(--gold)",
                  color: "var(--ground)",
                  font: "700 22px var(--font-body)",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×{count}
              </div>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 70,
          left: 0,
          right: 0,
          textAlign: "center",
          font: "400 28px var(--font-body)",
          color: "var(--parchment-55)",
        }}
      >
        Hold the seal on your phone to meet your role — {sworn} of {v.playerCount} have taken
        their sigils
      </div>
    </div>
  );
}
