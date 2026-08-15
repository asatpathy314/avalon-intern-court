import type { RoleKey } from "./types";

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;

/** Mission team sizes per player count (index = mission 0..4) */
export const MISSION_SIZES: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

/** mission index that needs two Fail cards (7+ players only), else -1 */
export function twoFailMission(playerCount: number): number {
  return playerCount >= 7 ? 3 : -1;
}

export function failsRequired(playerCount: number, mission: number): number {
  return mission === twoFailMission(playerCount) ? 2 : 1;
}

export function evilCount(playerCount: number): number {
  if (playerCount <= 6) return 2;
  if (playerCount <= 9) return 3;
  return 4;
}

/** Default special roles by player count. Servants/Minions fill the remainder. */
export function defaultSpecials(playerCount: number): RoleKey[] {
  const specials: RoleKey[] = ["merlin", "mistress", "mordred", "morgana"];
  if (playerCount >= 7) specials.push("assassin");
  if (playerCount >= 10) specials.push("oberon");
  return specials;
}

export const GOOD_ROLES: RoleKey[] = ["merlin", "mistress", "servant"];
export const EVIL_ROLES: RoleKey[] = ["mordred", "morgana", "assassin", "minion", "oberon"];

export function isEvil(role: RoleKey): boolean {
  return EVIL_ROLES.includes(role);
}

/** Build the full role list for a game given player count + disabled specials. */
export function buildRoleList(playerCount: number, disabled: RoleKey[]): RoleKey[] {
  const evil = evilCount(playerCount);
  const good = playerCount - evil;
  const specials = defaultSpecials(playerCount).filter((r) => !disabled.includes(r));
  const roles: RoleKey[] = [];
  const goodSpecials = specials.filter((r) => !isEvil(r));
  const evilSpecials = specials.filter((r) => isEvil(r));
  roles.push(...goodSpecials);
  for (let i = goodSpecials.length; i < good; i++) roles.push("servant");
  roles.push(...evilSpecials);
  for (let i = evilSpecials.length; i < evil; i++) roles.push("minion");
  return roles;
}

/** Priority used to resolve the assassin flag if the configured holder isn't in play. */
export const FLAG_PRIORITY: RoleKey[] = ["assassin", "morgana", "mordred", "oberon", "minion"];

/** Default flag holder: real Assassin seat at 7+, Morgana at 5–6. */
export function defaultAssassinFlag(playerCount: number): RoleKey {
  return playerCount >= 7 ? "assassin" : "morgana";
}

/** Room codes: 4 uppercase letters, no I/O (0/1 excluded by being letters-only). */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export function randomCode(rng: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return s;
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Scripted TV beat timings (ms) — the server refuses to advance before these elapse. */
export const VOTE_REVEAL_MS = 800 + 500 + 600 + 4000; // stillness + flip + stamp + hold
export function questRevealMs(cardCount: number): number {
  return 1600 + cardCount * 1200 + 2000; // fly-in/shuffle + per-card beat + hold on last
}
export const ASSASSIN_REVEAL_MS = 5000;
/** grace after the scripted beat before the server advances on its own (TV gone, etc.) */
export const AUTO_ADVANCE_GRACE_MS = 12000;

export const ROOM_TTL_SECONDS = 12 * 60 * 60;
