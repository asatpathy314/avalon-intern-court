"use client";

import { useEffect, useState } from "react";
import { useRoom } from "@/components/useRoom";
import type { PlayerView } from "@/lib/views";
import { Crest } from "@/components/Crest";
import { KnowledgeBox, RoleReveal } from "./RoleReveal";
import { ProposeScreen } from "./Propose";
import { QuestScreen, VoteScreen } from "./VoteQuest";
import { AssassinScreen } from "./Assassin";
import { Plate } from "@/components/Plate";

/** Hold the header chip to privately recall your role mid-game; release to hide. */
function RolePeek({ v }: { v: PlayerView }) {
  const [held, setHeld] = useState(false);
  // the overlay covers the chip, so end the hold from window-level events
  useEffect(() => {
    if (!held) return;
    const off = () => setHeld(false);
    window.addEventListener("pointerup", off);
    window.addEventListener("pointercancel", off);
    window.addEventListener("blur", off);
    return () => {
      window.removeEventListener("pointerup", off);
      window.removeEventListener("pointercancel", off);
      window.removeEventListener("blur", off);
    };
  }, [held]);

  const role = v.role;
  if (!role) {
    return (
      <span className="flame" style={{ color: "var(--gold)" }}>
        ✦
      </span>
    );
  }
  return (
    <>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          setHeld(true);
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Hold to recall your role"
        style={{
          font: "600 11px var(--font-body)",
          letterSpacing: "0.1em",
          color: "var(--gold)",
          border: "1px solid rgba(201,162,75,0.45)",
          borderRadius: 2,
          padding: "2px 8px",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      >
        <span className="flame">{role.sigil}</span> ROLE
      </button>
      {held && (
        <div
          className="pause-overlay"
          style={{ background: "rgba(11,13,24,0.95)", gap: 14, padding: 24 }}
        >
          <Plate role={role.key} width={180} showFlavor={false} />
          {role.knowledge && (
            <div style={{ width: "100%", maxWidth: 320 }}>
              <KnowledgeBox knowledge={role.knowledge} />
            </div>
          )}
          {role.flagHolder && role.key !== "assassin" && (
            <div style={{ font: "400 12px var(--font-body)", color: "var(--evil-text)" }}>
              You carry the assassin&apos;s flag.
            </div>
          )}
          <div
            style={{
              font: "600 11px var(--font-body)",
              letterSpacing: "0.12em",
              color: "var(--parchment-55)",
            }}
          >
            ◉ RELEASE TO HIDE
          </div>
        </div>
      )}
    </>
  );
}

function Header({ v }: { v: PlayerView }) {
  const leaderLabel =
    v.leaderId === v.me.id ? "♛ YOU" : v.leaderName ? `♛ ${v.leaderName}` : "—";
  return (
    <div className="phone-header" style={{ alignItems: "center" }}>
      <RolePeek v={v} />
      <span>{v.phase === "gameover" ? "ENDGAME" : `MISSION ${v.mission + 1} / 5`}</span>
      <span>{v.phase === "gameover" ? "—" : leaderLabel}</span>
    </div>
  );
}

export function Waiting({
  title,
  sub,
  dark = false,
}: {
  title: string;
  sub?: string;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        textAlign: "center",
        opacity: dark ? 0.8 : 1,
      }}
    >
      <div className="serif" style={{ font: "600 24px var(--font-serif)", lineHeight: 1.3 }}>
        {title}
      </div>
      {sub && (
        <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-55)", maxWidth: 280 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Controller({
  code,
  token,
  onLeave,
}: {
  code: string;
  token: string;
  onLeave: () => void;
}) {
  const { view: v, fatal, toast, act } = useRoom<PlayerView>(code, token);
  const [showLeave, setShowLeave] = useState(false);

  if (fatal) {
    return (
      <main className="phone-screen" style={{ justifyContent: "center", gap: 18, textAlign: "center" }}>
        <div className="serif" style={{ font: "600 24px var(--font-serif)" }}>{fatal}</div>
        <button className="btn-ghost" onClick={onLeave}>
          Return to the gates
        </button>
      </main>
    );
  }
  if (!v) {
    return (
      <main className="phone-screen" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="kicker flame" style={{ color: "var(--gold)" }}>
          Entering the court…
        </div>
      </main>
    );
  }

  const body = () => {
    switch (v.phase) {
      case "lobby":
        return (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              textAlign: "center",
            }}
          >
            <Crest name={v.me.name} size={64} />
            <div className="serif" style={{ font: "700 30px var(--font-serif)" }}>{v.me.name}</div>
            <div style={{ color: "var(--parchment-55)", font: "400 14px var(--font-body)" }}>
              You are seated. The court gathers on the TV —<br />
              {v.playerCount} of 10 seats filled.
            </div>
            <button
              onClick={() => setShowLeave(true)}
              style={{ color: "var(--parchment-55)", font: "500 12px var(--font-body)", letterSpacing: "0.1em", marginTop: 24 }}
            >
              LEAVE SEAT
            </button>
            {showLeave && (
              <div className="pause-overlay">
                <div className="serif" style={{ font: "600 22px var(--font-serif)" }}>Leave the court?</div>
                <button className="btn-ghost" style={{ maxWidth: 260 }} onClick={onLeave}>
                  Leave
                </button>
                <button className="btn-gold" style={{ maxWidth: 260 }} onClick={() => setShowLeave(false)}>
                  Stay seated
                </button>
              </div>
            )}
          </div>
        );
      case "setup":
        return (
          <Waiting
            title="The Game Master shapes the court…"
            sub="Roles are being chosen on the TV. Your part comes next."
          />
        );
      case "reveal":
        return <RoleReveal v={v} act={act} />;
      case "proposal":
        if (v.isLeader) return <ProposeScreen v={v} act={act} />;
        return (
          <Waiting
            title={`${v.leaderName} considers the court…`}
            sub={`They must choose ${v.missionSizes[v.mission]} for Mission ${v.mission + 1}.`}
          />
        );
      case "voting":
        return <VoteScreen v={v} act={act} />;
      case "voteReveal":
        return (
          <Waiting
            title="The court has spoken"
            sub={
              v.voteResult
                ? `${v.voteResult.approved ? "Approved" : "Rejected"}, ${v.voteResult.approve} – ${v.voteResult.reject}. Eyes on the TV.`
                : "Eyes on the TV."
            }
          />
        );
      case "quest":
        if (v.onTeam) return <QuestScreen v={v} act={act} />;
        return (
          <Waiting
            title={`${v.proposalNames.join(" and ")} ride for Mission ${v.mission + 1}`}
            sub={`${v.cardsIn} of ${v.cardsNeeded} cards cast.`}
          />
        );
      case "questReveal":
        return <Waiting title="The cards are cast" sub="Watch the table." />;
      case "assassination":
        if (v.assassin?.choosing) return <AssassinScreen v={v} act={act} />;
        return (
          <Waiting
            dark
            title="The Assassin considers the court…"
            sub="Three quests are won. One blade remains."
          />
        );
      case "assassinationReveal":
        return <Waiting dark title="The blade falls" sub="Eyes on the TV." />;
      case "gameover": {
        const g = v.gameover!;
        const good = g.winner === "good";
        return (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              textAlign: "center",
            }}
          >
            <div
              className="serif"
              style={{
                font: "700 30px var(--font-serif)",
                color: good ? "var(--good-text)" : "var(--evil-text)",
              }}
            >
              {good ? "◯ The light holds" : "◆ Mordred prevails"}
            </div>
            <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-75)", maxWidth: 300 }}>
              {g.winReason}
            </div>
            {v.role && <Plate role={v.role.key} width={180} showFlavor={false} />}
            <div style={{ font: "400 12px var(--font-body)", color: "var(--parchment-55)" }}>
              The full unmasking is on the TV. The Game Master can call another game.
            </div>
          </div>
        );
      }
    }
  };

  return (
    <main className="phone-screen">
      <Header v={v} />
      {body()}
      {v.paused && (
        <div className="pause-overlay">
          <div className="flame" style={{ fontSize: 28, color: "var(--gold)" }}>✦</div>
          <div className="serif" style={{ font: "600 24px var(--font-serif)" }}>The court sleeps</div>
          <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-55)", maxWidth: 280 }}>
            The TV has lost its connection. The game is paused and will resume when the Game
            Master returns.
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
