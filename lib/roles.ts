import type { Allegiance, RoleKey } from "./types";

// single source of truth — trivially recastable (files in public/portraits/)
export const PORTRAITS: Record<RoleKey, string> = {
  merlin: "/portraits/merlin.jpg",
  mistress: "/portraits/mistress.jpg", // Percival, renamed in all copy
  servant: "/portraits/servant.jpg", // shared by every Servant
  mordred: "/portraits/mordred.jpg",
  morgana: "/portraits/morgana.jpg", // assassin flag holder at 5–6p
  assassin: "/portraits/assassin.jpg", // separate role, 7+ players
  minion: "/portraits/minion.jpg", // shared
  oberon: "/portraits/oberon.jpg", // 10 players only
};

export interface RoleInfo {
  key: RoleKey;
  name: string;
  shortName: string;
  sigil: string;
  flavor: string;
  allegiance: Allegiance;
  shared: boolean;
  /** two lines of role coaching, shown on the private hold-to-reveal */
  coaching: string;
}

export const ROLES: Record<RoleKey, RoleInfo> = {
  merlin: {
    key: "merlin",
    name: "Merlin",
    shortName: "Merlin",
    sigil: "✦",
    flavor: "He has read the Slack channels you deleted.",
    allegiance: "good",
    shared: false,
    coaching:
      "You see the agents of Evil. Guide the court without being seen to guide it.",
  },
  mistress: {
    key: "mistress",
    name: "Merlin's Mistress",
    shortName: "M.'s Mistress",
    sigil: "☾",
    flavor: "Two figures shimmer before her. Only one is her Merlin.",
    allegiance: "good",
    shared: false,
    coaching:
      "One of the two is your Merlin; the other wears his face. Shield the true one with your doubt.",
  },
  servant: {
    key: "servant",
    name: "Servant of Arthur",
    shortName: "Servant",
    sigil: "✛",
    flavor: "No powers. No knowledge. Unlimited conviction.",
    allegiance: "good",
    shared: true,
    coaching: "You know nothing, and that is your shield. Watch the votes. Trust slowly.",
  },
  mordred: {
    key: "mordred",
    name: "Mordred",
    shortName: "Mordred",
    sigil: "✠",
    flavor: "Merlin's sight passes over him like a blind spot.",
    allegiance: "evil",
    shared: false,
    coaching: "Merlin cannot see you. Sit close to the crown and smile.",
  },
  morgana: {
    key: "morgana",
    name: "Morgana",
    shortName: "Morgana",
    sigil: "❖",
    flavor: "Wears Merlin's face like a borrowed coat.",
    allegiance: "evil",
    shared: false,
    coaching:
      "The Mistress sees you beside Merlin and cannot tell you apart. Be the better wizard.",
  },
  assassin: {
    key: "assassin",
    name: "The Assassin",
    shortName: "Assassin",
    sigil: "✕",
    flavor: "One blade, one name, one chance.",
    allegiance: "evil",
    shared: false,
    coaching:
      "Fail quests if you must — but your true work is a name. Study whoever steers too well.",
  },
  minion: {
    key: "minion",
    name: "Minion of Mordred",
    shortName: "Minion",
    sigil: "▼",
    flavor: "Fails quests. Denies everything.",
    allegiance: "evil",
    shared: true,
    coaching: "You know your kin. Sow doubt, waste votes, and fail at the worst moment.",
  },
  oberon: {
    key: "oberon",
    name: "Oberon",
    shortName: "Oberon",
    sigil: "◉",
    flavor: "Evil, alone, and unaware of his own side.",
    allegiance: "evil",
    shared: false,
    coaching: "You serve Mordred, but no one serves you. Find your kin by their knives.",
  },
};

/** display order for "Roles in Play" and the unmasking */
export const ROLE_ORDER: RoleKey[] = [
  "merlin",
  "mistress",
  "servant",
  "mordred",
  "morgana",
  "assassin",
  "minion",
  "oberon",
];
