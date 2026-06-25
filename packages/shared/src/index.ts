import { scaleRatingDelta } from "./rating";
import type { ModeAvailabilityMap } from "./mode-availability";

export type MatchStatus =
  | "waiting"
  | "joined"
  | "funded"
  | "playing"
  | "settled"
  | "cancelled"
  | "draw";

export type GameEndReason =
  | "checkmate"
  | "resign"
  | "timeout"
  | "stalemate"
  | "draw"
  | "disconnect";

export interface RakeConfig {
  houseRakeBps: number;
}

export interface BetBreakdown {
  betLamports: number;
  potLamports: number;
  rakeLamports: number;
  maxPayoutLamports: number;
  rakePercent: number;
}

export interface LobbyMatch {
  id: string;
  player1: string;
  player2?: string;
  betLamports: number;
  tokenMint?: string | null;
  status: MatchStatus;
  onChainAddress?: string;
  createdAt: number;
  /** Creator rating at lobby creation */
  player1Rating?: number;
  /** Joiner rating when funded */
  player2Rating?: number;
  ranked?: boolean;
  /** Parent tournament when this lobby is a bracket match. */
  tournamentId?: string;
  bracketMatchId?: string;
  /** House rake for this match (basis points). */
  rakeBps?: number;
  gameMode?: string;
}

export interface ChessMovePayload {
  matchId: string;
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}

export interface GameState {
  matchId: string;
  fen: string;
  turn: "w" | "b";
  playerWhite: string;
  playerBlack: string;
  betLamports: number;
  potLamports: number;
  rakeBps: number;
  moves: string[];
  status: MatchStatus;
  winner?: string;
  endReason?: GameEndReason;
  settleSignature?: string;
  whiteTimeMs: number;
  blackTimeMs: number;
  /** Fischer increment added to the mover after each move (0 = none). */
  incrementMs?: number;
  /** Player who left mid-game; clock paused until reconnect or grace expires. */
  disconnectedPlayer?: string;
  /** Unix ms — forfeit if disconnected player has not rejoined by this time. */
  reconnectDeadlineMs?: number;
}

export interface AppConfig {
  houseRakeBps: number;
  programId: string;
  rpcUrl: string;
  solanaCluster?: "devnet" | "testnet" | "mainnet-beta";
  /** When true, the web app must follow solanaCluster from the server (production). */
  clusterLocked?: boolean;
  allowedMints: string[];
  /** @deprecated Prefer escrowDiagnostics.feeRecipientSet — not exposed on public API. */
  authority?: string;
  /** @deprecated Prefer escrowDiagnostics.feeRecipientSet — not exposed on public API. */
  feeRecipient?: string;
  mockEscrow?: boolean;
  escrowReady?: boolean;
  escrowDiagnostics?: EscrowDiagnostics | PublicEscrowDiagnostics;
  /** Per-mode availability toggles from admin (open / coming_soon / closed). */
  gameModeAvailability?: ModeAvailabilityMap;
}

/** Escrow health flags returned to browsers — no wallet addresses or balances. */
export interface PublicEscrowDiagnostics {
  mockEscrowOff: boolean;
  feeRecipientSet: boolean;
  programIdSet: boolean;
  programIdValid?: boolean;
  programDeployed: boolean;
  globalConfigInitialized: boolean;
  authorityFunded: boolean;
  rpcReachable?: boolean;
  missingSteps: string[];
}

/** Public `/api/config` payload — no internal infra or authority details. */
export type PublicAppConfig = Omit<
  AppConfig,
  "authority" | "feeRecipient" | "escrowDiagnostics"
> & {
  escrowDiagnostics?: PublicEscrowDiagnostics;
};

export interface EscrowDiagnostics {
  mockEscrowOff: boolean;
  feeRecipientSet: boolean;
  programIdSet: boolean;
  programDeployed: boolean;
  globalConfigInitialized: boolean;
  authorityFunded: boolean;
  authorityBalanceLamports: number;
  feeRecipient: string;
  authority: string;
  programId: string;
  globalConfigPda: string;
  houseTreasuryPda: string;
  rpcUrl: string;
  rpcReachable?: boolean;
  programIdValid?: boolean;
  missingSteps: string[];
}

export interface MatchReceipt {
  matchId: string;
  playerWhite: string;
  playerBlack: string;
  winner?: string;
  betLamports: number;
  potLamports: number;
  rakeLamports: number;
  pgn: string;
  settleSignature?: string;
  receiptHash: string;
  createdAt: number;
}

export interface GameOverResult {
  state: GameState;
  winner?: string;
  reason?: GameEndReason | string;
  settleSignature?: string;
  ratingChanges?: RatingDelta[];
}

/** Persistent player ranking — default 500 on first game. */
export interface PlayerProfile {
  wallet: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  updatedAt: number;
  /** Unique display name (wallet users only). */
  nickname?: string | null;
  /** data: URL or remote image URL. */
  avatarUrl?: string | null;
}

export interface UpdatePlayerProfileInput {
  nickname?: string | null;
  avatarUrl?: string | null;
}

export interface RatingDelta {
  wallet: string;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
}

export interface MatchmakeQueuedPayload {
  wallet: string;
  betLamports: number;
  ranked?: boolean;
}

export interface MatchmakeStatusPayload {
  queued: boolean;
  betLamports?: number;
  waitMs?: number;
  rating?: number;
  searchRadius?: number;
}

export interface MatchmakeFoundPayload {
  matchId: string;
  role: "creator" | "joiner";
  opponentWallet: string;
  opponentRating: number;
  betLamports: number;
  ratingGap: number;
}

export interface TokenInfo {
  mint: string;
  symbol: string;
  decimals: number;
  name: string;
}

export function computeBetBreakdown(
  betLamports: number,
  houseRakeBps: number,
): BetBreakdown {
  const potLamports = betLamports * 2;
  const rakeLamports = Math.floor((potLamports * houseRakeBps) / 10_000);
  const maxPayoutLamports = potLamports - rakeLamports;
  return {
    betLamports,
    potLamports,
    rakeLamports,
    maxPayoutLamports,
    rakePercent: houseRakeBps / 100,
  };
}

/** Draw settlement: platform rake is taken, remainder split between players. */
export function computeDrawBreakdown(
  betLamports: number,
  houseRakeBps: number,
): BetBreakdown & { refundLamports: number } {
  const breakdown = computeBetBreakdown(betLamports, houseRakeBps);
  const refundLamports = Math.floor(
    (breakdown.potLamports - breakdown.rakeLamports) / 2,
  );
  return { ...breakdown, refundLamports };
}

export function solToLamports(sol: number): number {
  return Math.round(sol * 1_000_000_000);
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

/** Player session issued after Sign-in with Solana (SIWS). */
export interface PlayerSessionInfo {
  token: string;
  wallet: string;
  expiresAt: number;
}

/** Server-issued guest session for casual play without a wallet. */
export interface GuestSessionInfo {
  guestId: string;
  token: string;
  expiresAt: number;
}

export const SOCKET_EVENTS = {
  LOBBY_LIST: "lobby:list",
  LOBBY_SYNC: "lobby:sync",
  LOBBY_UPDATE: "lobby:update",
  LOBBY_CREATE: "lobby:create",
  LOBBY_JOIN: "lobby:join",
  LOBBY_CANCEL: "lobby:cancel",
  LOBBY_LEAVE: "lobby:leave",
  LOBBY_CANCELLED: "lobby:cancelled",
  GAME_JOIN: "game:join",
  GAME_MOVE: "game:move",
  GAME_STATE: "game:state",
  GAME_OVER: "game:over",
  GAME_RESIGN: "game:resign",
  GAME_LEAVE: "game:leave",
  GAME_ACTIVE: "game:active",
  LOBBY_ACTIVE: "lobby:active",
  GAME_ERROR: "game:error",
  MATCH_FUNDED: "match:funded",
  PLAYER_PROFILE: "player:profile",
  PLAYER_PROFILE_UPDATE: "player:profile:update",
  MATCHMAKE_QUEUE: "matchmake:queue",
  MATCHMAKE_CANCEL: "matchmake:cancel",
  MATCHMAKE_QUEUED: "matchmake:queued",
  MATCHMAKE_STATUS: "matchmake:status",
  MATCHMAKE_FOUND: "matchmake:found",
  TOURNAMENT_LIST: "tournament:list",
  TOURNAMENT_UPDATE: "tournament:update",
  TOURNAMENT_REGISTER: "tournament:register",
  TOURNAMENT_UNREGISTER: "tournament:unregister",
  TOURNAMENT_REGISTERED: "tournament:registered",
  TOURNAMENT_QUEUE_STATUS: "tournament:queue:status",
  TOURNAMENT_QUEUES_LIST: "tournament:queues:list",
  TOURNAMENT_MATCH_READY: "tournament:match:ready",
  TOURNAMENT_FINISHED: "tournament:finished",
} as const;

export const NATIVE_SOL_MINT =
  "So11111111111111111111111111111111111111112";

export function shortenAddress(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 1) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

/** Starting rating for new players. */
export const DEFAULT_RATING = 500;

/** Minimum rating floor after losses. */
export const MIN_RATING = 100;

/** Max |Δrating| to pair in ranked queue (widens over wait time). */
export const MATCHMAKE_INITIAL_RADIUS = 50;
export const MATCHMAKE_MAX_RADIUS = 250;
export const MATCHMAKE_RADIUS_GROWTH_MS = 8_000;
export const MATCHMAKE_RADIUS_STEP = 25;

/** Soft label for open-table pairing quality. */
export const RATING_EVEN_MATCH = 50;
export const RATING_MAX_OPEN_JOIN = 350;

export type RatingTierId =
  | "grandmaster"
  | "master"
  | "expert"
  | "intermediate"
  | "rookie";

export function ratingTierId(rating: number): RatingTierId {
  if (rating >= 900) return "grandmaster";
  if (rating >= 750) return "master";
  if (rating >= 600) return "expert";
  if (rating >= 450) return "intermediate";
  return "rookie";
}

export function ratingTier(rating: number): string {
  const id = ratingTierId(rating);
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function computeRatingDelta(
  rating: number,
  opponentRating: number,
  score: 0 | 0.5 | 1,
  gamesPlayed: number,
): number {
  const k = eloKFactor(gamesPlayed);
  const expected = expectedScore(rating, opponentRating);
  return Math.round(k * (score - expected));
}

export function eloKFactor(gamesPlayed: number): number {
  return gamesPlayed < 10 ? 48 : 32;
}

export function formatEloDelta(delta: number): string {
  return `${delta >= 0 ? "+" : ""}${delta}`;
}

export interface EloOutcomePreview {
  win: number;
  loss: number;
  draw: number;
  k: number;
}

/** Estimated ELO change for win / loss / draw vs a given opponent. */
export function previewEloDeltas(
  rating: number,
  opponentRating: number,
  gamesPlayed: number,
  multiplier = 1,
): EloOutcomePreview {
  const k = eloKFactor(gamesPlayed);
  return {
    k,
    win: scaleRatingDelta(
      computeRatingDelta(rating, opponentRating, 1, gamesPlayed),
      multiplier,
    ),
    loss: scaleRatingDelta(
      computeRatingDelta(rating, opponentRating, 0, gamesPlayed),
      multiplier,
    ),
    draw: scaleRatingDelta(
      computeRatingDelta(rating, opponentRating, 0.5, gamesPlayed),
      multiplier,
    ),
  };
}

export function clampRating(rating: number): number {
  return Math.max(MIN_RATING, Math.round(rating));
}

export * from "./tournament";
export * from "./economics";
export * from "./rating";
export * from "./escrow";
export * from "./lobby-match";
export * from "./profile";
export * from "./bots";
export * from "./chess-draw-rules";
export * from "./mode-availability";
export * from "./tictactoe-engine";
