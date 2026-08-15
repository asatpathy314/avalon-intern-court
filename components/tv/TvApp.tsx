"use client";

import { useEffect, useRef, useState } from "react";
import { useRoom } from "@/components/useRoom";
import type { TvView } from "@/lib/views";
import { ASSASSIN_REVEAL_MS, VOTE_REVEAL_MS, questRevealMs } from "@/lib/rules";
import { TvLobby } from "./Lobby";
import { TvSetup } from "./Setup";
import { RolesInPlay } from "./RolesInPlay";
import { RoundTable } from "./RoundTable";
import { VoteReveal } from "./VoteReveal";
import { QuestReveal } from "./QuestReveal";
import { AssassinationQuiet, AssassinationReveal } from "./Assassination";
import { GameOver } from "./GameOver";

/** re-render clock for scripted beats */
export function useNow(active: boolean, interval = 100): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [active, interval]);
  return now;
}

/** Fixed 1920×1080 stage scaled to the viewport so all spec sizes are true 1080p values. */
function Stage({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const onResize = () =>
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <main
      className="tv-screen"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div style={{ width: 1920 * scale, height: 1080 * scale, overflow: "hidden" }}>
        <div
          style={{
            width: 1920,
            height: 1080,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "relative",
          }}
        >
          {children}
        </div>
      </div>
    </main>
  );
}

export function TvApp({
  code,
  hostToken,
  onRoomLost,
}: {
  code: string;
  hostToken: string;
  onRoomLost: () => void;
}) {
  const { view: v, fatal, toast, act, clockOffset } = useRoom<TvView>(code, hostToken);
  const ackedRef = useRef<string>("");
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    setNarrow(window.innerWidth < 700);
  }, []);

  // the TV drives the scripted beats: ack exactly when the animation completes
  useEffect(() => {
    if (!v) return;
    let dueAt: number | null = null;
    let key = "";
    if (v.phase === "voteReveal" && v.voteReveal) {
      dueAt = v.voteReveal.revealAt + VOTE_REVEAL_MS + 150;
      key = `vote:${v.voteReveal.revealAt}`;
    } else if (v.phase === "questReveal" && v.questReveal) {
      dueAt = v.questReveal.revealAt + questRevealMs(v.questReveal.cards.length) + 150;
      key = `quest:${v.questReveal.revealAt}`;
    } else if (v.phase === "assassinationReveal" && v.assassinReveal) {
      dueAt = v.assassinReveal.revealAt + ASSASSIN_REVEAL_MS + 150;
      key = `blade:${v.assassinReveal.revealAt}`;
    }
    if (dueAt == null || ackedRef.current === key) return;
    const wait = Math.max(0, dueAt - (Date.now() + clockOffset));
    const t = setTimeout(() => {
      ackedRef.current = key;
      act("ack");
    }, wait);
    return () => clearTimeout(t);
  }, [v, act, clockOffset]);

  if (fatal) {
    return (
      <main
        className="tv-screen"
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div style={{ textAlign: "center", display: "grid", gap: 16, maxWidth: 520 }}>
          <div className="serif" style={{ font: "600 34px var(--font-serif)" }}>{fatal}</div>
          <button className="btn-gold" onClick={onRoomLost}>
            Convene a new court
          </button>
        </div>
      </main>
    );
  }
  if (!v) {
    return (
      <main
        className="tv-screen"
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div className="kicker flame" style={{ color: "var(--gold)" }}>Raising the court…</div>
      </main>
    );
  }

  const screen = () => {
    switch (v.phase) {
      case "lobby":
        return <TvLobby v={v} act={act} />;
      case "setup":
        return <TvSetup v={v} act={act} />;
      case "reveal":
        return <RolesInPlay v={v} />;
      case "proposal":
      case "voting":
      case "quest":
        return <RoundTable v={v} />;
      case "voteReveal":
        return <VoteReveal v={v} clockOffset={clockOffset} />;
      case "questReveal":
        return <QuestReveal v={v} clockOffset={clockOffset} />;
      case "assassination":
        return <AssassinationQuiet v={v} />;
      case "assassinationReveal":
        return <AssassinationReveal v={v} clockOffset={clockOffset} />;
      case "gameover":
        return <GameOver v={v} act={act} />;
    }
  };

  return (
    <>
      <Stage>{screen()}</Stage>
      {narrow && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "var(--surface)",
            borderTop: "1px solid var(--gold-dim)",
            padding: "10px 14px",
            font: "400 12px/1.5 var(--font-body)",
            color: "var(--parchment-75)",
            zIndex: 70,
          }}
        >
          This is the <b>TV screen</b> — open it on the biggest browser in the room (or cast
          this tab). Players join on their phones.
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
