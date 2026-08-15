import type {
  Config,
  GameState,
  Player,
  QuestCard,
  RoleKey,
  Vote,
} from "./types";
import {
  ASSASSIN_REVEAL_MS,
  AUTO_ADVANCE_GRACE_MS,
  FLAG_PRIORITY,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MISSION_SIZES,
  VOTE_REVEAL_MS,
  buildRoleList,
  defaultAssassinFlag,
  defaultSpecials,
  failsRequired,
  isEvil,
  questRevealMs,
  shuffle,
} from "./rules";

export class GameError extends Error {}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new GameError(msg);
}

export function createRoom(code: string, hostToken: string, now = Date.now()): GameState {
  return {
    code,
    hostToken,
    phase: "lobby",
    players: [],
    config: {
      disabled: [],
      assassinFlag: "assassin",
      assassination: true,
      rejectionVariant: "official",
    },
    roles: {},
    rolesInPlay: [],
    flagHolderId: null,
    leaderIndex: 0,
    mission: 0,
    rejections: 0,
    proposal: [],
    votes: {},
    voteMeta: null,
    lastVote: null,
    questCards: {},
    questMeta: null,
    history: [],
    assassinTargetId: null,
    assassinRevealAt: null,
    winner: null,
    winReason: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function addPlayer(s: GameState, p: { id: string; token: string; name: string }): GameState {
  assert(s.phase === "lobby" || s.phase === "setup", "The court has already convened");
  const name = p.name.trim().slice(0, 14);
  assert(name.length >= 1, "A name is required");
  assert(s.players.length < MAX_PLAYERS, "The court is full (10 seats)");
  assert(
    !s.players.some((q) => q.name.toLowerCase() === name.toLowerCase()),
    "That name is already seated"
  );
  const player: Player = { id: p.id, token: p.token, name, seat: s.players.length, ready: false };
  return { ...s, players: [...s.players, player] };
}

export function kickPlayer(s: GameState, playerId: string): GameState {
  assert(s.phase === "lobby" || s.phase === "setup", "Seats are locked once the court convenes");
  const players = s.players
    .filter((p) => p.id !== playerId)
    .map((p, i) => ({ ...p, seat: i }));
  return { ...s, players };
}

export function startSetup(s: GameState): GameState {
  assert(s.phase === "lobby", "Not in the lobby");
  assert(s.players.length >= MIN_PLAYERS, `Need at least ${MIN_PLAYERS} players`);
  return {
    ...s,
    phase: "setup",
    config: { ...s.config, assassinFlag: defaultAssassinFlag(s.players.length) },
  };
}

export function updateConfig(s: GameState, cfg: Partial<Config>): GameState {
  assert(s.phase === "setup", "Configuration is only open during Court Setup");
  const n = s.players.length;
  const legal = defaultSpecials(n);
  const disabled = (cfg.disabled ?? s.config.disabled).filter((r) => legal.includes(r));
  const flagWanted = cfg.assassinFlag ?? s.config.assassinFlag;
  assert(isEvil(flagWanted), "The assassin flag belongs to Evil");
  const rejectionVariant = cfg.rejectionVariant ?? s.config.rejectionVariant;
  assert(
    rejectionVariant === "official" || rejectionVariant === "unopposed",
    "Unknown rejection variant"
  );
  const assassination = cfg.assassination ?? s.config.assassination !== false;
  return {
    ...s,
    config: { disabled, assassinFlag: flagWanted, assassination: !!assassination, rejectionVariant },
  };
}

/** Deal roles and enter the private-reveal phase. */
export function beginCourt(s: GameState, rng: () => number = Math.random): GameState {
  assert(s.phase === "setup", "Not in Court Setup");
  const n = s.players.length;
  const roleList = buildRoleList(n, s.config.disabled);
  const dealt = shuffle(roleList, rng);
  const roles: Record<string, RoleKey> = {};
  s.players.forEach((p, i) => (roles[p.id] = dealt[i]));

  // resolve the assassin flag: configured holder if in play, else priority order.
  // Merlin resting or the assassination toggle being off means no endgame guess at all.
  let flagHolderId: string | null = null;
  if (!s.config.disabled.includes("merlin") && s.config.assassination !== false) {
    const inPlay = (r: RoleKey) => Object.values(roles).includes(r);
    const flagRole = inPlay(s.config.assassinFlag)
      ? s.config.assassinFlag
      : FLAG_PRIORITY.find(inPlay);
    if (flagRole) {
      flagHolderId = s.players.find((p) => roles[p.id] === flagRole)!.id;
    }
  }

  return {
    ...s,
    phase: "reveal",
    roles,
    rolesInPlay: [...dealt].sort(),
    flagHolderId,
    players: s.players.map((p) => ({ ...p, ready: false })),
    leaderIndex: Math.floor(rng() * n),
    mission: 0,
    rejections: 0,
    proposal: [],
    votes: {},
    voteMeta: null,
    lastVote: null,
    questCards: {},
    questMeta: null,
    history: [],
    assassinTargetId: null,
    assassinRevealAt: null,
    winner: null,
    winReason: null,
  };
}

export function playerReady(s: GameState, playerId: string): GameState {
  assert(s.phase === "reveal", "Not in the reveal phase");
  const players = s.players.map((p) => (p.id === playerId ? { ...p, ready: true } : p));
  const next: GameState = { ...s, players };
  if (players.every((p) => p.ready)) next.phase = "proposal";
  return next;
}

export function leader(s: GameState): Player {
  return s.players[s.leaderIndex % s.players.length];
}

function missionSize(s: GameState): number {
  return MISSION_SIZES[s.players.length][s.mission];
}

/** In the unopposed variant, the 5th proposal after 4 rejections skips the vote entirely. */
function isUnopposedProposal(s: GameState): boolean {
  return s.config.rejectionVariant === "unopposed" && s.rejections >= 4;
}

export function propose(s: GameState, playerId: string, team: string[]): GameState {
  assert(s.phase === "proposal", "Not accepting proposals");
  assert(leader(s).id === playerId, "Only the leader proposes");
  const unique = [...new Set(team)];
  assert(unique.length === missionSize(s), `Choose exactly ${missionSize(s)}`);
  assert(
    unique.every((id) => s.players.some((p) => p.id === id)),
    "Unknown player in proposal"
  );
  if (isUnopposedProposal(s)) {
    return {
      ...s,
      proposal: unique,
      votes: {},
      voteMeta: null,
      lastVote: { approve: 0, reject: 0, unopposed: true },
      questCards: {},
      phase: "quest",
    };
  }
  return { ...s, proposal: unique, votes: {}, voteMeta: null, phase: "voting" };
}

export function vote(s: GameState, playerId: string, v: Vote, now = Date.now()): GameState {
  assert(s.phase === "voting", "Not voting now");
  assert(v === "approve" || v === "reject", "Unknown vote");
  assert(!(playerId in s.votes), "Your vote is sealed — no unvote");
  const votes = { ...s.votes, [playerId]: v };
  const next: GameState = { ...s, votes };
  if (Object.keys(votes).length === s.players.length) {
    const approve = Object.values(votes).filter((x) => x === "approve").length;
    const reject = s.players.length - approve;
    next.phase = "voteReveal";
    next.voteMeta = { approve, reject, approved: approve > reject, revealAt: now };
  }
  return next;
}

export function ackVoteReveal(s: GameState, now = Date.now(), force = false): GameState {
  assert(s.phase === "voteReveal" && s.voteMeta, "Nothing to acknowledge");
  const elapsed = now - s.voteMeta.revealAt;
  assert(force || elapsed >= VOTE_REVEAL_MS - 250, "The court is still watching");
  const { approve, reject, approved } = s.voteMeta;
  // votes are never recorded on screen afterward — cleared here, tally kept for the recap
  const base: GameState = { ...s, votes: {}, voteMeta: null };
  if (approved) {
    return {
      ...base,
      lastVote: { approve, reject, unopposed: false },
      questCards: {},
      phase: "quest",
    };
  }
  const rejections = s.rejections + 1;
  if (rejections >= 5 && s.config.rejectionVariant === "official") {
    return {
      ...base,
      rejections,
      phase: "gameover",
      winner: "evil",
      winReason: "Five proposals rejected — the court collapses into Mordred's hands.",
    };
  }
  return {
    ...base,
    rejections,
    leaderIndex: (s.leaderIndex + 1) % s.players.length,
    proposal: [],
    phase: "proposal",
  };
}

export function playQuestCard(
  s: GameState,
  playerId: string,
  card: QuestCard,
  now = Date.now(),
  rng: () => number = Math.random
): GameState {
  assert(s.phase === "quest", "No quest underway");
  assert(s.proposal.includes(playerId), "You do not ride on this mission");
  assert(!(playerId in s.questCards), "Your card is cast");
  assert(card === "success" || card === "fail", "Unknown card");
  // house rule: anyone may fail a quest, Good included
  const questCards = { ...s.questCards, [playerId]: card };
  const next: GameState = { ...s, questCards };
  if (Object.keys(questCards).length === s.proposal.length) {
    const cards = shuffle(Object.values(questCards), rng);
    const fails = cards.filter((c) => c === "fail").length;
    const success = fails < failsRequired(s.players.length, s.mission);
    next.phase = "questReveal";
    next.questMeta = { cards, fails, success, revealAt: now };
  }
  return next;
}

export function ackQuestReveal(s: GameState, now = Date.now(), force = false): GameState {
  assert(s.phase === "questReveal" && s.questMeta, "Nothing to acknowledge");
  const elapsed = now - s.questMeta.revealAt;
  assert(force || elapsed >= questRevealMs(s.questMeta.cards.length) - 250, "The cards are still turning");
  const { fails, success } = s.questMeta;
  const record = {
    mission: s.mission,
    team: s.proposal.map((id) => s.players.find((p) => p.id === id)!.name),
    approve: s.lastVote?.approve ?? 0,
    reject: s.lastVote?.reject ?? 0,
    unopposed: s.lastVote?.unopposed ?? false,
    fails,
    success,
  };
  const history = [...s.history, record];
  const wins = history.filter((h) => h.success).length;
  const losses = history.filter((h) => !h.success).length;
  const base: GameState = {
    ...s,
    history,
    questCards: {},
    questMeta: null,
    lastVote: null,
    proposal: [],
  };
  if (losses >= 3) {
    return {
      ...base,
      phase: "gameover",
      winner: "evil",
      winReason: "Three quests have failed. Mordred's court stands revealed and victorious.",
    };
  }
  if (wins >= 3) {
    if (s.flagHolderId) {
      return { ...base, phase: "assassination" };
    }
    return {
      ...base,
      phase: "gameover",
      winner: "good",
      winReason: "Three quests won. With no blade raised against Merlin, the light holds.",
    };
  }
  return {
    ...base,
    mission: s.mission + 1,
    rejections: 0,
    leaderIndex: (s.leaderIndex + 1) % s.players.length,
    phase: "proposal",
  };
}

export function assassinate(
  s: GameState,
  playerId: string,
  targetId: string,
  now = Date.now()
): GameState {
  assert(s.phase === "assassination", "The blade is not drawn");
  assert(s.flagHolderId === playerId, "The blade is not yours");
  assert(targetId !== playerId, "You cannot strike yourself");
  const target = s.players.find((p) => p.id === targetId);
  assert(target, "Unknown target");
  // targets are players not unmasked as Evil to the flag holder:
  // all evil is off the table except Oberon, whom his own side cannot see
  const targetRole = s.roles[targetId];
  const holderRole = s.roles[playerId];
  const knownEvil =
    isEvil(targetRole) && targetRole !== "oberon" && holderRole !== "oberon";
  assert(!knownEvil, "That courtier already serves Mordred");
  const hit = targetRole === "merlin";
  return {
    ...s,
    assassinTargetId: targetId,
    assassinRevealAt: now,
    phase: "assassinationReveal",
    winner: hit ? "evil" : "good",
    winReason: hit
      ? `The blade finds Merlin. ${target.name} falls, and with him the light.`
      : `The blade misses. ${target.name} was no wizard — the light holds.`,
  };
}

export function ackAssassinationReveal(s: GameState, now = Date.now(), force = false): GameState {
  assert(s.phase === "assassinationReveal" && s.assassinRevealAt, "Nothing to acknowledge");
  assert(force || now - s.assassinRevealAt >= ASSASSIN_REVEAL_MS - 250, "The court holds its breath");
  return { ...s, phase: "gameover" };
}

export function playAgain(s: GameState): GameState {
  assert(s.phase === "gameover", "The game is not over");
  return {
    ...createRoom(s.code, s.hostToken, s.createdAt),
    players: s.players.map((p) => ({ ...p, ready: false })),
    config: s.config,
    phase: "setup",
    updatedAt: Date.now(),
  };
}

/** Lazily advance scripted beats if the TV never acked (disconnects, dead room). */
export function autoAdvance(s: GameState, now = Date.now()): GameState | null {
  if (s.phase === "voteReveal" && s.voteMeta) {
    if (now - s.voteMeta.revealAt >= VOTE_REVEAL_MS + AUTO_ADVANCE_GRACE_MS)
      return ackVoteReveal(s, now, true);
  }
  if (s.phase === "questReveal" && s.questMeta) {
    if (
      now - s.questMeta.revealAt >=
      questRevealMs(s.questMeta.cards.length) + AUTO_ADVANCE_GRACE_MS
    )
      return ackQuestReveal(s, now, true);
  }
  if (s.phase === "assassinationReveal" && s.assassinRevealAt) {
    if (now - s.assassinRevealAt >= ASSASSIN_REVEAL_MS + AUTO_ADVANCE_GRACE_MS)
      return ackAssassinationReveal(s, now, true);
  }
  return null;
}
