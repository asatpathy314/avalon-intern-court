export type RoleKey =
  | "merlin"
  | "mistress"
  | "servant"
  | "mordred"
  | "morgana"
  | "assassin"
  | "minion"
  | "oberon";

export type Allegiance = "good" | "evil";

export type Phase =
  | "lobby"
  | "setup"
  | "reveal"
  | "proposal"
  | "voting"
  | "voteReveal"
  | "quest"
  | "questReveal"
  | "assassination"
  | "assassinationReveal"
  | "gameover";

export type Vote = "approve" | "reject";
export type QuestCard = "success" | "fail";

export interface Player {
  id: string;
  token: string;
  name: string;
  seat: number;
  ready: boolean;
}

export interface Config {
  /** special roles the GM has rested; their seats become plain Servant / Minion */
  disabled: RoleKey[];
  /** which evil role carries the assassin flag; resolved against roles actually in play at deal time */
  assassinFlag: RoleKey;
  rejectionVariant: "official" | "unopposed";
}

export interface MissionRecord {
  mission: number;
  team: string[]; // player names
  approve: number;
  reject: number;
  unopposed: boolean;
  fails: number;
  success: boolean;
}

export interface VoteMeta {
  approve: number;
  reject: number;
  approved: boolean;
  revealAt: number;
}

export interface QuestMeta {
  cards: QuestCard[]; // shuffled — order carries no information
  fails: number;
  success: boolean;
  revealAt: number;
}

export interface GameState {
  code: string;
  hostToken: string;
  phase: Phase;
  players: Player[];
  config: Config;
  /** playerId -> role. Server only — stripped from every client view. */
  roles: Record<string, RoleKey>;
  /** public once dealt: the multiset of roles at the table, no name attached */
  rolesInPlay: RoleKey[];
  /** resolved at deal time: playerId holding the assassin flag (null = no assassination phase) */
  flagHolderId: string | null;
  leaderIndex: number;
  mission: number; // 0..4
  rejections: number;
  proposal: string[]; // playerIds
  votes: Record<string, Vote>;
  voteMeta: VoteMeta | null;
  /** carried from the approving vote so the mission record can include it */
  lastVote: { approve: number; reject: number; unopposed: boolean } | null;
  questCards: Record<string, QuestCard>;
  questMeta: QuestMeta | null;
  history: MissionRecord[];
  assassinTargetId: string | null;
  assassinRevealAt: number | null;
  winner: Allegiance | null;
  winReason: string | null;
  createdAt: number;
  updatedAt: number;
}
