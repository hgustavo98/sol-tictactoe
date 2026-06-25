export const BOT_WALLET_PREFIX = "bot_sf_";
/** Server-controlled guest tables (`guest_gr_*`) — not real player guest sessions. */
export const GHOST_GUEST_PREFIX = "guest_gr_";

export interface BotPersona {
  id: string;
  nickname: string;
  /** Public path on the web app, e.g. /bots/alvaro.jpg */
  avatarUrl?: string;
  /** Display / matchmaking rating */
  rating: number;
  /** Stockfish UCI_Elo when limiting strength */
  uciElo: number;
  skillLevel: number;
  movetimeMs: number;
  thinkDelayMs: number;
  seedGamesPlayed: number;
  seedWins: number;
  seedLosses: number;
  seedDraws: number;
}

export function botAvatarPath(personaId: string): string {
  return `/bots/${personaId}.jpg`;
}

export const BOT_PERSONAS: readonly BotPersona[] = [
  {
    id: "alvaro",
    nickname: "Alvaro_Chess",
    avatarUrl: botAvatarPath("alvaro"),
    rating: 850,
    uciElo: 850,
    skillLevel: 3,
    movetimeMs: 700,
    thinkDelayMs: 550,
    seedGamesPlayed: 96,
    seedWins: 41,
    seedLosses: 48,
    seedDraws: 7,
  },
  {
    id: "mia",
    nickname: "MiaTactics",
    avatarUrl: botAvatarPath("mia"),
    rating: 1050,
    uciElo: 1050,
    skillLevel: 6,
    movetimeMs: 900,
    thinkDelayMs: 700,
    seedGamesPlayed: 142,
    seedWins: 72,
    seedLosses: 62,
    seedDraws: 8,
  },
  {
    id: "chen",
    nickname: "ChenSol",
    avatarUrl: botAvatarPath("chen"),
    rating: 1250,
    uciElo: 1250,
    skillLevel: 9,
    movetimeMs: 1100,
    thinkDelayMs: 850,
    seedGamesPlayed: 210,
    seedWins: 118,
    seedLosses: 84,
    seedDraws: 8,
  },
  {
    id: "elena",
    nickname: "ElenaGrande",
    avatarUrl: botAvatarPath("elena"),
    rating: 1450,
    uciElo: 1450,
    skillLevel: 12,
    movetimeMs: 1400,
    thinkDelayMs: 1000,
    seedGamesPlayed: 288,
    seedWins: 171,
    seedLosses: 102,
    seedDraws: 15,
  },
  {
    id: "viktor",
    nickname: "ViktorMate",
    avatarUrl: botAvatarPath("viktor"),
    rating: 1650,
    uciElo: 1650,
    skillLevel: 15,
    movetimeMs: 1700,
    thinkDelayMs: 1200,
    seedGamesPlayed: 356,
    seedWins: 219,
    seedLosses: 118,
    seedDraws: 19,
  },
  {
    id: "nova",
    nickname: "NovaGM",
    avatarUrl: botAvatarPath("nova"),
    rating: 1850,
    uciElo: 1850,
    skillLevel: 18,
    movetimeMs: 2000,
    thinkDelayMs: 1400,
    seedGamesPlayed: 402,
    seedWins: 268,
    seedLosses: 118,
    seedDraws: 16,
  },
  {
    id: "sol",
    nickname: "SolMaster",
    avatarUrl: botAvatarPath("sol"),
    rating: 2050,
    uciElo: 2050,
    skillLevel: 20,
    movetimeMs: 2400,
    thinkDelayMs: 1600,
    seedGamesPlayed: 510,
    seedWins: 362,
    seedLosses: 128,
    seedDraws: 20,
  },
] as const;

const GUEST_GHOST_DEFAULT_STATS = {
  seedGamesPlayed: 24,
  seedWins: 9,
  seedLosses: 13,
  seedDraws: 2,
} as const;

/** Casual ghost guests — appear as Guest · XXXX in the lobby, ELO 500. */
export const GUEST_GHOST_PERSONAS: readonly BotPersona[] = [
  {
    id: "k7m2x9pq",
    nickname: "",
    rating: 500,
    uciElo: 500,
    skillLevel: 2,
    movetimeMs: 550,
    thinkDelayMs: 480,
    ...GUEST_GHOST_DEFAULT_STATS,
  },
  {
    id: "n4w8h3jt",
    nickname: "",
    rating: 500,
    uciElo: 500,
    skillLevel: 2,
    movetimeMs: 550,
    thinkDelayMs: 520,
    ...GUEST_GHOST_DEFAULT_STATS,
  },
  {
    id: "p9r2c6vl",
    nickname: "",
    rating: 500,
    uciElo: 500,
    skillLevel: 2,
    movetimeMs: 600,
    thinkDelayMs: 450,
    ...GUEST_GHOST_DEFAULT_STATS,
  },
  {
    id: "b3f8d1mx",
    nickname: "",
    rating: 500,
    uciElo: 500,
    skillLevel: 2,
    movetimeMs: 580,
    thinkDelayMs: 500,
    ...GUEST_GHOST_DEFAULT_STATS,
  },
  {
    id: "t6y4s9qk",
    nickname: "",
    rating: 500,
    uciElo: 500,
    skillLevel: 2,
    movetimeMs: 560,
    thinkDelayMs: 490,
    ...GUEST_GHOST_DEFAULT_STATS,
  },
  {
    id: "h2j5v8wn",
    nickname: "",
    rating: 500,
    uciElo: 500,
    skillLevel: 2,
    movetimeMs: 570,
    thinkDelayMs: 510,
    ...GUEST_GHOST_DEFAULT_STATS,
  },
  {
    id: "q8l3z6rp",
    nickname: "",
    rating: 500,
    uciElo: 500,
    skillLevel: 2,
    movetimeMs: 590,
    thinkDelayMs: 470,
    ...GUEST_GHOST_DEFAULT_STATS,
  },
  {
    id: "m5x9g2tc",
    nickname: "",
    rating: 500,
    uciElo: 500,
    skillLevel: 2,
    movetimeMs: 540,
    thinkDelayMs: 530,
    ...GUEST_GHOST_DEFAULT_STATS,
  },
] as const;

export const CASUAL_GHOST_PERSONAS: readonly BotPersona[] = [
  ...BOT_PERSONAS,
  ...GUEST_GHOST_PERSONAS,
];

export function botWalletForPersona(id: string): string {
  return `${BOT_WALLET_PREFIX}${id}`;
}

export function ghostGuestWalletForPersona(id: string): string {
  return `${GHOST_GUEST_PREFIX}${id}`;
}

export function walletForCasualGhostPersona(persona: BotPersona): string {
  if (GUEST_GHOST_PERSONAS.some((g) => g.id === persona.id)) {
    return ghostGuestWalletForPersona(persona.id);
  }
  return botWalletForPersona(persona.id);
}

export function isBotWallet(wallet: string): boolean {
  return wallet.startsWith(BOT_WALLET_PREFIX);
}

export function isGhostGuestWallet(wallet: string): boolean {
  return wallet.startsWith(GHOST_GUEST_PREFIX);
}

export function isServerOpponentWallet(wallet: string): boolean {
  return isBotWallet(wallet) || isGhostGuestWallet(wallet);
}

export function getBotPersona(wallet: string): BotPersona | undefined {
  if (!isBotWallet(wallet)) return undefined;
  const id = wallet.slice(BOT_WALLET_PREFIX.length);
  return BOT_PERSONAS.find((p) => p.id === id);
}

export function getGhostGuestPersona(wallet: string): BotPersona | undefined {
  if (!isGhostGuestWallet(wallet)) return undefined;
  const id = wallet.slice(GHOST_GUEST_PREFIX.length);
  return GUEST_GHOST_PERSONAS.find((p) => p.id === id);
}

export function getServerOpponentPersona(wallet: string): BotPersona | undefined {
  return getBotPersona(wallet) ?? getGhostGuestPersona(wallet);
}

export function botInMatch(playerWhite: string, playerBlack: string): string | undefined {
  if (isServerOpponentWallet(playerWhite)) return playerWhite;
  if (isServerOpponentWallet(playerBlack)) return playerBlack;
  return undefined;
}
