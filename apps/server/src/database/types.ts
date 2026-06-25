import type { LobbyMatch, MatchReceipt, PlayerProfile } from "@sol-tictactoe/shared";

export type PersistedMatchKind = "lobby" | "playing";

/** Durable snapshot for crash recovery (lobbies + in-progress games). */
export interface PersistedActiveMatch {
  matchId: string;
  kind: PersistedMatchKind;
  lobby: LobbyMatch;
  fen?: string;
  moves?: string[];
  whiteTimeMs?: number;
  blackTimeMs?: number;
  incrementMs?: number;
  lastTickAt?: number;
  disconnectedPlayer?: string;
  reconnectDeadlineMs?: number;
  clockPaused?: boolean;
  waitingGrace?: { wallet: string; deadlineMs: number };
  updatedAt: number;
}

export type DatabaseProvider = "mongodb";

export type BankLedgerType =
  | "escrow_lock"
  | "escrow_release"
  | "rake_fee"
  | "payout_winner"
  | "refund"
  | "settlement"
  | "fee_withdraw"
  | "treasury_withdraw";

export interface BankLedgerEntry {
  id: string;
  type: BankLedgerType;
  matchId?: string;
  wallet: string;
  lamports: number;
  signature?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface AdminSessionRecord {
  token: string;
  platformId: string;
  actor: string;
  createdAt: number;
  expiresAt: number;
}

export interface PlayerSessionRecord {
  token: string;
  wallet: string;
  createdAt: number;
  expiresAt: number;
}

export interface GuestSessionRecord {
  token: string;
  guestId: string;
  createdAt: number;
  expiresAt: number;
  socketId?: string | null;
}

export interface MatchLogEntry {
  id: string;
  matchId: string;
  event: string;
  payload: unknown;
  createdAt: number;
}

export interface DbStats {
  receipts: number;
  players: number;
  matchLogEvents: number;
  totalRakeLamports: number;
  bankEntries: number;
  totalBankLamports: number;
}

export interface ClientSummary {
  wallet: string;
  nickname?: string | null;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalSpentLamports: number;
  paidGames: number;
  lastSeenAt?: number;
  lastGameAt?: number;
}

export interface ClientGameRow {
  matchId: string;
  betLamports: number;
  potLamports: number;
  rakeLamports: number;
  role: "white" | "black";
  opponent: string;
  won: boolean | null;
  createdAt: number;
  gameMode?: string;
}

export interface RecentGameRow {
  matchId: string;
  playerWhite: string;
  playerBlack: string;
  winner?: string;
  betLamports: number;
  potLamports: number;
  rakeLamports: number;
  createdAt: number;
  gameMode?: string;
}

export interface GameModeStatRow {
  gameMode: string;
  lobbiesCreated: number;
  gamesCompleted: number;
}

export interface DailyVisitRow {
  day: string;
  pageViews: number;
  uniqueVisitors: number;
}

export interface DataStore {
  readonly provider: DatabaseProvider;
  connect(): Promise<void>;
  close(): Promise<void>;
  saveReceipt(receipt: MatchReceipt): Promise<void>;
  getReceipts(limit: number): Promise<MatchReceipt[]>;
  getReceiptsForWallet(wallet: string, limit: number): Promise<MatchReceipt[]>;
  getReceiptsPaginated(
    limit: number,
    offset: number,
  ): Promise<{ items: MatchReceipt[]; total: number }>;
  logMatchEvent(
    matchId: string,
    event: string,
    payload?: unknown,
  ): Promise<void>;
  getMatchLog(opts: {
    matchId?: string;
    limit?: number;
    offset?: number;
  }): Promise<MatchLogEntry[]>;
  getOrCreatePlayer(wallet: string): Promise<PlayerProfile>;
  getPlayerProfile(wallet: string): Promise<PlayerProfile | null>;
  updatePlayerStats(
    wallet: string,
    result: { rating: number; won: boolean; lost: boolean; drew: boolean },
  ): Promise<PlayerProfile>;
  updatePlayerRating(wallet: string, rating: number): Promise<PlayerProfile>;
  seedBotProfile(
    wallet: string,
    profile: {
      nickname: string;
      rating: number;
      gamesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
      avatarUrl?: string | null;
    },
  ): Promise<void>;
  getPlayersPaginated(
    limit: number,
    offset: number,
  ): Promise<{ items: PlayerProfile[]; total: number }>;
  updatePlayerProfile(
    wallet: string,
    input: { nickname?: string | null; avatarUrl?: string | null },
  ): Promise<PlayerProfile>;
  isNicknameTaken(nicknameKey: string, excludeWallet?: string): Promise<boolean>;
  searchPlayers(query: string, limit: number): Promise<PlayerProfile[]>;
  getPlayerProfilesBatch(wallets: string[]): Promise<PlayerProfile[]>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  getAllSettings(): Promise<Record<string, string>>;
  logAdminAction(
    action: string,
    payload?: unknown,
    actor?: string,
  ): Promise<void>;
  getDbStats(): Promise<DbStats>;
  recordBankEntry(entry: BankLedgerEntry): Promise<void>;
  getBankLedger(opts: {
    limit?: number;
    offset?: number;
    matchId?: string;
    type?: BankLedgerType;
  }): Promise<{ items: BankLedgerEntry[]; total: number }>;
  sumBankLedgerLamports(opts: {
    types: BankLedgerType[];
    wallet?: string;
    since?: number;
  }): Promise<number>;
  createSession(session: AdminSessionRecord): Promise<void>;
  getSession(token: string): Promise<AdminSessionRecord | null>;
  deleteSession(token: string): Promise<void>;
  createPlayerSession(session: PlayerSessionRecord): Promise<void>;
  getPlayerSession(token: string): Promise<PlayerSessionRecord | null>;
  deletePlayerSession(token: string): Promise<void>;
  recordSiteVisit(visitorId: string): Promise<void>;
  getDailyVisits(days: number): Promise<DailyVisitRow[]>;
  getClientsWithStats(opts: {
    limit: number;
    offset: number;
    search?: string;
  }): Promise<{ items: ClientSummary[]; total: number }>;
  getClientDetail(wallet: string): Promise<{
    profile: PlayerProfile;
    totalSpentLamports: number;
    paidGames: number;
    recentGames: ClientGameRow[];
  } | null>;
  getGameModeStats(): Promise<GameModeStatRow[]>;
  getRecentGames(limit: number): Promise<RecentGameRow[]>;
  upsertActiveMatch(snapshot: PersistedActiveMatch): Promise<void>;
  deleteActiveMatch(matchId: string): Promise<void>;
  listActiveMatches(): Promise<PersistedActiveMatch[]>;
  consumeRateLimit(key: string, windowMs: number, max: number): Promise<boolean>;
  revokePlayerSessions(wallet: string): Promise<void>;
  createGuestSession(session: GuestSessionRecord): Promise<void>;
  getGuestSession(token: string): Promise<GuestSessionRecord | null>;
  bindGuestSessionSocket(token: string, socketId: string): Promise<boolean>;
  releaseGuestSessionSocket(socketId: string): Promise<void>;
}
