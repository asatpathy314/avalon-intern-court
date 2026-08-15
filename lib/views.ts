import type { GameState, MissionRecord, Phase, QuestCard, RoleKey, Vote } from "./types";
import { ROLES } from "./roles";
import { MISSION_SIZES, isEvil, twoFailMission } from "./rules";
import { leader } from "./engine";

const PRESENCE_MS = 15000;

export interface PublicPlayer {
  id: string;
  name: string;
  seat: number;
  ready: boolean;
  connected: boolean;
}

export interface CastEntry {
  name: string;
  role: RoleKey;
}

interface CommonView {
  code: string;
  phase: Phase;
  players: PublicPlayer[];
  playerCount: number;
  missionSizes: number[];
  twoFailIndex: number;
  leaderId: string | null;
  leaderName: string | null;
  mission: number;
  rejections: number;
  rejectionVariant: "official" | "unopposed";
  rolesInPlay: RoleKey[];
  proposalIds: string[];
  proposalNames: string[];
  votedIds: string[];
  /** per-mission results for the quest track (null = not yet played) */
  questResults: ({ success: boolean; fails: number } | null)[];
  serverNow: number;
}

export interface TvView extends CommonView {
  kind: "tv";
  config: {
    disabled: RoleKey[];
    assassinFlag: RoleKey;
    assassination: boolean;
    rejectionVariant: string;
  };
  voteReveal: {
    votes: { name: string; vote: Vote }[];
    approve: number;
    reject: number;
    approved: boolean;
    revealAt: number;
  } | null;
  quest: { teamNames: string[]; cardsIn: number; cardsNeeded: number } | null;
  questReveal: { cards: QuestCard[]; fails: number; success: boolean; revealAt: number } | null;
  assassinReveal: {
    accusedName: string;
    merlinName: string;
    hit: boolean;
    revealAt: number;
  } | null;
  gameover: { winner: string; winReason: string; cast: CastEntry[]; recap: MissionRecord[] } | null;
}

export interface Knowledge {
  label: string;
  names: string[];
  note: string | null;
}

export interface PlayerView extends CommonView {
  kind: "player";
  me: { id: string; name: string; seat: number; ready: boolean };
  isLeader: boolean;
  role: {
    key: RoleKey;
    name: string;
    sigil: string;
    allegiance: "good" | "evil";
    flavor: string;
    coaching: string;
    knowledge: Knowledge | null;
    flagHolder: boolean;
  } | null;
  myVote: Vote | null;
  onTeam: boolean;
  myCard: QuestCard | null;
  cardsIn: number;
  cardsNeeded: number;
  voteResult: { approved: boolean; approve: number; reject: number } | null;
  assassin: { choosing: boolean; targets: { id: string; name: string }[] } | null;
  gameover: { winner: string; winReason: string; myRole: RoleKey; cast: CastEntry[] } | null;
  paused: boolean;
}

function common(s: GameState, seen: Record<string, number>, now: number): CommonView {
  const started = s.phase !== "lobby" && s.phase !== "setup";
  const lead = started && s.players.length > 0 ? leader(s) : null;
  const questResults: CommonView["questResults"] = [null, null, null, null, null];
  for (const h of s.history) questResults[h.mission] = { success: h.success, fails: h.fails };
  const idToName = (id: string) => s.players.find((p) => p.id === id)?.name ?? "?";
  return {
    code: s.code,
    phase: s.phase,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      ready: p.ready,
      connected: now - (seen[p.id] ?? 0) < PRESENCE_MS,
    })),
    playerCount: s.players.length,
    missionSizes: MISSION_SIZES[s.players.length] ?? MISSION_SIZES[5],
    twoFailIndex: twoFailMission(s.players.length),
    leaderId: lead?.id ?? null,
    leaderName: lead?.name ?? null,
    mission: s.mission,
    rejections: s.rejections,
    rejectionVariant: s.config.rejectionVariant,
    rolesInPlay: s.rolesInPlay,
    proposalIds: s.proposal,
    proposalNames: s.proposal.map(idToName),
    votedIds: s.phase === "voting" ? Object.keys(s.votes) : [],
    questResults,
    serverNow: now,
  };
}

function castList(s: GameState): CastEntry[] {
  return s.players.map((p) => ({ name: p.name, role: s.roles[p.id] }));
}

export function tvView(s: GameState, seen: Record<string, number>, now = Date.now()): TvView {
  const idToName = (id: string) => s.players.find((p) => p.id === id)?.name ?? "?";
  return {
    kind: "tv",
    ...common(s, seen, now),
    config: { ...s.config, assassination: s.config.assassination !== false },
    voteReveal:
      s.phase === "voteReveal" && s.voteMeta
        ? {
            votes: [...s.players]
              .sort((a, b) => a.seat - b.seat)
              .map((p) => ({ name: p.name, vote: s.votes[p.id] })),
            approve: s.voteMeta.approve,
            reject: s.voteMeta.reject,
            approved: s.voteMeta.approved,
            revealAt: s.voteMeta.revealAt,
          }
        : null,
    quest:
      s.phase === "quest"
        ? {
            teamNames: s.proposal.map(idToName),
            cardsIn: Object.keys(s.questCards).length,
            cardsNeeded: s.proposal.length,
          }
        : null,
    questReveal: s.phase === "questReveal" && s.questMeta ? { ...s.questMeta } : null,
    assassinReveal:
      s.phase === "assassinationReveal" && s.assassinTargetId
        ? {
            accusedName: idToName(s.assassinTargetId),
            merlinName:
              s.players.find((p) => s.roles[p.id] === "merlin")?.name ?? "no one",
            hit: s.roles[s.assassinTargetId] === "merlin",
            revealAt: s.assassinRevealAt!,
          }
        : null,
    gameover:
      s.phase === "gameover"
        ? {
            winner: s.winner!,
            winReason: s.winReason ?? "",
            cast: castList(s),
            recap: s.history,
          }
        : null,
  };
}

function knowledgeFor(s: GameState, playerId: string): Knowledge | null {
  const role = s.roles[playerId];
  const bySeat = [...s.players].sort((a, b) => a.seat - b.seat);
  const namesOf = (pred: (r: RoleKey) => boolean, excludeSelf = true) =>
    bySeat
      .filter((p) => (excludeSelf ? p.id !== playerId : true) && pred(s.roles[p.id]))
      .map((p) => p.name);
  const inPlay = (r: RoleKey) => s.rolesInPlay.includes(r);

  if (role === "merlin") {
    return {
      label: "KNOWN TO YOU — EVIL WALKS AS:",
      names: namesOf((r) => isEvil(r) && r !== "mordred"),
      note: inPlay("mordred") ? "(Mordred hides from you)" : null,
    };
  }
  if (role === "mistress") {
    // alphabetical so the order says nothing about which is which
    const pair = namesOf((r) => r === "merlin" || r === "morgana").sort((a, b) =>
      a.localeCompare(b)
    );
    return {
      label: "TWO FIGURES SHIMMER — ONE IS YOUR MERLIN:",
      names: pair,
      note: inPlay("morgana") ? "(the other is Morgana, wearing his face)" : "(your sight is clear — this is Merlin)",
    };
  }
  if (role === "oberon") {
    return {
      label: "KNOWN TO YOU:",
      names: [],
      note: "No one. You are evil, alone, and unlisted among your own.",
    };
  }
  if (isEvil(role)) {
    return {
      label: "YOUR KIN IN SHADOW:",
      names: namesOf((r) => isEvil(r) && r !== "oberon"),
      note: inPlay("oberon") ? "(Oberon walks unseen, even by you)" : null,
    };
  }
  return null;
}

export function playerView(
  s: GameState,
  playerId: string,
  seen: Record<string, number>,
  now = Date.now()
): PlayerView | null {
  const me = s.players.find((p) => p.id === playerId);
  if (!me) return null;
  const role = s.roles[playerId];
  const dealt = !!role && s.phase !== "lobby" && s.phase !== "setup";
  const onTeam = s.proposal.includes(playerId);
  const hostSeen = seen["host"] ?? 0;
  const midGame = !["lobby", "setup", "gameover"].includes(s.phase);
  const flagHolder = s.flagHolderId === playerId;
  const info = dealt ? ROLES[role] : null;

  return {
    kind: "player",
    ...common(s, seen, now),
    me: { id: me.id, name: me.name, seat: me.seat, ready: me.ready },
    isLeader: dealt && leader(s).id === playerId,
    role:
      dealt && info
        ? {
            key: role,
            name: info.name,
            sigil: info.sigil,
            allegiance: info.allegiance,
            flavor: info.flavor,
            coaching: info.coaching,
            knowledge: knowledgeFor(s, playerId),
            flagHolder,
          }
        : null,
    myVote: s.phase === "voting" ? s.votes[playerId] ?? null : null,
    onTeam,
    myCard: s.phase === "quest" ? s.questCards[playerId] ?? null : null,
    cardsIn: s.phase === "quest" ? Object.keys(s.questCards).length : 0,
    cardsNeeded: s.phase === "quest" ? s.proposal.length : 0,
    voteResult:
      s.phase === "voteReveal" && s.voteMeta
        ? {
            approved: s.voteMeta.approved,
            approve: s.voteMeta.approve,
            reject: s.voteMeta.reject,
          }
        : null,
    assassin:
      s.phase === "assassination" && flagHolder
        ? {
            choosing: true,
            targets: s.players
              .filter((p) => {
                if (p.id === playerId) return false;
                const r = s.roles[p.id];
                const holderRole = s.roles[playerId];
                const known = isEvil(r) && r !== "oberon" && holderRole !== "oberon";
                return !known;
              })
              .map((p) => ({ id: p.id, name: p.name })),
          }
        : null,
    gameover:
      s.phase === "gameover"
        ? { winner: s.winner!, winReason: s.winReason ?? "", myRole: role, cast: castList(s) }
        : null,
    paused: midGame && now - hostSeen > PRESENCE_MS,
  };
}
