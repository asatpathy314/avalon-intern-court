"use client";

import { useState } from "react";
import type { PlayerView } from "@/lib/views";

export function VoteScreen({
  v,
  act,
}: {
  v: PlayerView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  // optimistic: stamp immediately, server reconciles
  const [castLocal, setCastLocal] = useState<"approve" | "reject" | null>(null);
  const cast = v.myVote ?? castLocal;

  const voteFor = async (vote: "approve" | "reject") => {
    setCastLocal(vote);
    const ok = await act("vote", { vote });
    if (!ok) setCastLocal(null);
  };

  if (cast) {
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
        <div
          className={`vote-btn ${cast} stamp-in`}
          style={{ flex: "none", width: 180, height: 150, opacity: 0.7 }}
        >
          <span style={{ fontSize: 30 }}>{cast === "approve" ? "◯" : "◆"}</span>
          <span>{cast === "approve" ? "APPROVE" : "REJECT"}</span>
        </div>
        <div className="serif" style={{ font: "600 22px var(--font-serif)" }}>
          Sealed
        </div>
        <div style={{ font: "400 12px var(--font-body)", color: "var(--parchment-55)" }}>
          Waiting for the court · {v.votedIds.length} of {v.playerCount} votes cast
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
      <div
        className="serif"
        style={{ font: "600 20px var(--font-serif)", textAlign: "center", lineHeight: 1.35 }}
      >
        {v.leaderName} proposes
        <br />
        {v.proposalNames.join(" · ")}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        <button className="vote-btn approve" onClick={() => voteFor("approve")}>
          <span style={{ fontSize: 34 }}>◯</span>
          <span>APPROVE</span>
        </button>
        <button className="vote-btn reject" onClick={() => voteFor("reject")}>
          <span style={{ fontSize: 30 }}>◆</span>
          <span>REJECT</span>
        </button>
      </div>
      <div style={{ textAlign: "center", font: "400 11px var(--font-body)", color: "rgba(237,230,214,0.4)" }}>
        your vote locks when cast · revealed all at once on the TV
      </div>
    </div>
  );
}

export function QuestScreen({
  v,
  act,
}: {
  v: PlayerView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  const [castLocal, setCastLocal] = useState<"success" | "fail" | null>(null);
  const cast = v.myCard ?? castLocal;

  const play = async (card: "success" | "fail") => {
    setCastLocal(card);
    const ok = await act("questCard", { card });
    if (!ok) setCastLocal(null);
  };

  if (cast) {
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
        <div className="serif stamp-in" style={{ font: "600 26px var(--font-serif)", color: "var(--gold)" }}>
          Your card is cast
        </div>
        <div style={{ font: "400 12px var(--font-body)", color: "var(--parchment-55)" }}>
          {v.cardsIn} of {v.cardsNeeded} cards on the table · shuffled before they turn
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
      <div className="serif" style={{ font: "600 24px var(--font-serif)", textAlign: "center" }}>
        You ride for Mission {v.mission + 1}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        <button className="vote-btn approve" onClick={() => play("success")}>
          <span style={{ fontSize: 34 }}>◯</span>
          <span>SUCCESS</span>
        </button>
        <button className="vote-btn reject" onClick={() => play("fail")}>
          <span style={{ fontSize: 30 }}>◆</span>
          <span>FAIL</span>
        </button>
      </div>
    </div>
  );
}
