/** Simplified economics — casual (free) and custom stakes only. */

export type GameModeId = "casual1v1" | "custom1v1";

export const GAME_MODES: GameModeId[] = ["casual1v1", "custom1v1"];

export const CASUAL_BET_SOL = 0;
export const CUSTOM_MIN_BET_SOL = 0.1;
export const CUSTOM_MAX_BET_SOL = 10;

/** Stubs for UI compatibility — ranked modes disabled. */
export const RANKED_BET_SOL = 0.1;
export const RANKED_MIN_BET_SOL = 0.1;
export const RANKED_MAX_BET_SOL = 10;
export const RANKED_BET_PRESETS_SOL = [RANKED_BET_SOL] as const;

export const SOLANA_BASE_FEE_LAMPORTS = 5_000;
export const ESCROW_TX_FEE_ESTIMATE_SOL = 0.00005;
export const MIN_HOUSE_RAKE_TARGET_SOL = 0.003;

export const CASUAL_RAKE_BPS = 0;
export const RANKED_RAKE_BPS = 200;
export const CUSTOM_RAKE_BPS = 300;

export const ONE_V_ONE_CLOCK_MS = 10 * 60 * 1000;
export const CASUAL_CLOCK_MS = 5 * 60 * 1000;
export const CASUAL_INCREMENT_MS = 3 * 1000;

export const RECONNECT_GRACE_MS = 90 * 1000;
export const RECONNECT_GRACE_SECS = RECONNECT_GRACE_MS / 1000;
export const WAITING_ROOM_DISCONNECT_GRACE_MS = 40 * 1000;
export const WAITING_ROOM_DISCONNECT_GRACE_SECS =
  WAITING_ROOM_DISCONNECT_GRACE_MS / 1000;

export function clockMsForLobby(lobby: { gameMode?: string }): number {
  if (lobby.gameMode && isCasualMode(lobby.gameMode as GameModeId)) {
    return CASUAL_CLOCK_MS;
  }
  return ONE_V_ONE_CLOCK_MS;
}

export function clockIncrementMsForLobby(lobby: { gameMode?: string }): number {
  if (lobby.gameMode && isCasualMode(lobby.gameMode as GameModeId)) {
    return CASUAL_INCREMENT_MS;
  }
  return 0;
}

export const MIN_BET_SOL = CUSTOM_MIN_BET_SOL;

function toLamports(sol: number): number {
  return Math.round(sol * 1_000_000_000);
}

function toSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

export const MIN_BET_LAMPORTS = toLamports(CUSTOM_MIN_BET_SOL);

export function isCustomMode(id: GameModeId): boolean {
  return id === "custom1v1";
}

export function isCasualMode(id: GameModeId): boolean {
  return id === "casual1v1";
}

export function isTournamentMode(_id: GameModeId): boolean {
  return false;
}

export function isRankedMode(_id: GameModeId): boolean {
  return false;
}

export function isRankedPresetsMode(_id: GameModeId): boolean {
  return false;
}

export function isRankedStakeMode(_id: GameModeId): boolean {
  return false;
}

export function modeCountsForRating(_id: GameModeId): boolean {
  return false;
}

export function lobbyCountsForRating(_lobby: {
  ranked?: boolean;
  tournamentId?: string;
}): boolean {
  return false;
}

export function isFreeCasualLobby(
  mode: GameModeId,
  betLamports: number,
): boolean {
  return isCasualMode(mode) && betLamports === 0;
}

export function isGuestWallet(wallet: string): boolean {
  return wallet.startsWith("guest_");
}

export class GuestAccessError extends Error {
  constructor(message = "Guests can only play free casual mode") {
    super(message);
    this.name = "GuestAccessError";
  }
}

export function assertGuestLobbyAccess(
  wallet: string,
  opts: {
    gameMode?: GameModeId;
    betLamports: number;
    ranked?: boolean;
    tournamentId?: string;
  },
): void {
  if (!isGuestWallet(wallet)) return;
  const mode = opts.gameMode ?? "casual1v1";
  if (
    opts.tournamentId ||
    opts.ranked ||
    mode !== "casual1v1" ||
    opts.betLamports !== 0
  ) {
    throw new GuestAccessError();
  }
}

export function tournamentSizeFromMode(_id: GameModeId): null {
  return null;
}

export function isFeaturedTournamentMode(_id: GameModeId): boolean {
  return false;
}

export function rakeBpsForMode(id: GameModeId): number {
  if (isCasualMode(id)) return CASUAL_RAKE_BPS;
  if (isCustomMode(id)) return CUSTOM_RAKE_BPS;
  return CASUAL_RAKE_BPS;
}

export function betSolForMode(id: GameModeId, customBet?: number): number {
  if (isCustomMode(id)) return customBet ?? CUSTOM_MIN_BET_SOL;
  return CASUAL_BET_SOL;
}

export function oneVOnePrizeSol(betSol: number, rakeBps: number): number {
  const betLamports = toLamports(betSol);
  const potLamports = betLamports * 2;
  const rakeLamports = Math.floor((potLamports * rakeBps) / 10_000);
  return (potLamports - rakeLamports) / 1_000_000_000;
}

export function prizeSolForMode(id: GameModeId, customBet?: number): number {
  const bet = betSolForMode(id, customBet);
  return oneVOnePrizeSol(bet, rakeBpsForMode(id));
}

export class LobbyEconomicsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LobbyEconomicsError";
  }
}

export function resolveLobbyEconomics(
  gameMode: GameModeId,
  betLamports: number,
): { rakeBps: number; gameMode: GameModeId } {
  const rakeBps = rakeBpsForMode(gameMode);

  if (isCustomMode(gameMode)) {
    const betSol = toSol(betLamports);
    if (betSol < CUSTOM_MIN_BET_SOL - 1e-9) {
      throw new LobbyEconomicsError(
        `Minimum custom bet is ${CUSTOM_MIN_BET_SOL} SOL`,
      );
    }
    if (betSol > CUSTOM_MAX_BET_SOL + 1e-9) {
      throw new LobbyEconomicsError(
        `Maximum custom bet is ${CUSTOM_MAX_BET_SOL} SOL`,
      );
    }
    return { rakeBps, gameMode };
  }

  if (betLamports !== 0) {
    throw new LobbyEconomicsError("Casual mode requires 0 SOL bet");
  }

  return { rakeBps, gameMode };
}

export function solToLamports(sol: number): number {
  return toLamports(sol);
}

/** Stubs — tournaments disabled in SOL TTT. */
export const TOURNAMENT_RAKE_BPS = 0;
export const TOURNAMENT_ENTRY_SOL = { 4: 0, 6: 0, 8: 0, 12: 0 } as const;
export function tournamentEntryLamports(_size: number): number {
  return 0;
}
