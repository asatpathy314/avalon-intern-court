"use client";

import { useState } from "react";
import type { Knowledge, PlayerView } from "@/lib/views";
import { Plate } from "@/components/Plate";

export function KnowledgeBox({ knowledge }: { knowledge: Knowledge }) {
  return (
    <div
      style={{
        width: "100%",
        background: "rgba(237,230,214,0.06)",
        padding: "10px 12px",
        font: "400 13px/1.6 var(--font-body)",
      }}
    >
      <span
        style={{
          font: "600 10px var(--font-body)",
          letterSpacing: "0.14em",
          color: "var(--parchment-55)",
        }}
      >
        {knowledge.label}
      </span>
      <br />
      {knowledge.names.join(" · ")}
      {knowledge.note && (
        <span style={{ color: "rgba(237,230,214,0.45)" }}> {knowledge.note}</span>
      )}
    </div>
  );
}

export function RoleReveal({
  v,
  act,
}: {
  v: PlayerView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  const [held, setHeld] = useState(false);
  const role = v.role!;
  const readyCount = v.players.filter((p) => p.ready).length;

  const holdProps = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      setHeld(true);
    },
    onPointerUp: () => setHeld(false),
    onPointerLeave: () => setHeld(false),
    onPointerCancel: () => setHeld(false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        {held ? (
          <>
            <Plate role={role.key} width={200} showFlavor={false} />
            <div
              style={{
                font: "400 12px/1.5 var(--font-body)",
                color: "var(--parchment-75)",
                textAlign: "center",
                maxWidth: 280,
              }}
            >
              {role.coaching}
              {role.flagHolder && role.key !== "assassin" && (
                <>
                  <br />
                  <span style={{ color: "var(--evil-text)" }}>
                    You carry the assassin&apos;s flag — the final blade is yours.
                  </span>
                </>
              )}
            </div>
            {role.knowledge && <KnowledgeBox knowledge={role.knowledge} />}
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              textAlign: "center",
            }}
          >
            <div className="flame" style={{ fontSize: 34, color: "var(--gold)" }}>✦</div>
            <div className="serif" style={{ font: "600 26px var(--font-serif)" }}>
              Your role awaits
            </div>
            <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-55)", maxWidth: 260 }}>
              Hold the seal below to reveal it. Release, and it hides again. Guard it from
              wandering eyes.
            </div>
          </div>
        )}
      </div>

      <button
        className={held ? "btn-gold" : "btn-ghost"}
        style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
        {...holdProps}
      >
        {held ? "◉ Holding — release to hide" : "◉ Hold to reveal"}
      </button>
      {v.me.ready ? (
        <div
          style={{
            textAlign: "center",
            font: "500 12px var(--font-body)",
            letterSpacing: "0.1em",
            color: "var(--parchment-55)",
            padding: "12px 0",
          }}
        >
          SWORN IN — {readyCount} OF {v.playerCount} HAVE TAKEN THEIR SIGILS
        </div>
      ) : (
        <button className="btn-gold" onClick={() => act("ready")}>
          Take up your sigil
        </button>
      )}
    </div>
  );
}
