import type { MatchReceipt, PlayerProfile } from "@sol-tictactoe/shared";
import {
  createBankEntry,
  getStore,
  type BankLedgerEntry,
  type BankLedgerType,
} from "./database";
import type { GuestSessionRecord } from "./database/types";

export { createBankEntry };
export type { BankLedgerEntry, BankLedgerType };

export async function saveReceipt(receipt: MatchReceipt): Promise<void> {
  await getStore().saveReceipt(receipt);
}

export async function getReceipts(limit = 20): Promise<MatchReceipt[]> {
  return getStore().getReceipts(limit);
}

export async function getReceiptsForWallet(
  wallet: string,
  limit = 20,
): Promise<MatchReceipt[]> {
  return getStore().getReceiptsForWallet(wallet, limit);
}

export function logMatchEvent(
  matchId: string,
  event: string,
  payload?: unknown,
): void {
  void getStore()
    .logMatchEvent(matchId, event, payload)
    .catch((err) => console.error("[db] logMatchEvent failed", err));
}

export async function getOrCreatePlayer(wallet: string): Promise<PlayerProfile> {
  return getStore().getOrCreatePlayer(wallet);
}

export async function getPlayerProfile(
  wallet: string,
): Promise<PlayerProfile | null> {
  return getStore().getPlayerProfile(wallet);
}

export async function updatePlayerStats(
  wallet: string,
  result: { rating: number; won: boolean; lost: boolean; drew: boolean },
): Promise<PlayerProfile> {
  return getStore().updatePlayerStats(wallet, result);
}

export async function updatePlayerRating(
  wallet: string,
  rating: number,
): Promise<PlayerProfile> {
  return getStore().updatePlayerRating(wallet, rating);
}

export async function getSetting(key: string): Promise<string | null> {
  return getStore().getSetting(key);
}

export async function setSetting(key: string, value: string): Promise<void> {
  await getStore().setSetting(key, value);
}

export async function getAllSettings(): Promise<Record<string, string>> {
  return getStore().getAllSettings();
}

export async function logAdminAction(
  action: string,
  payload?: unknown,
  actor?: string,
): Promise<void> {
  await getStore().logAdminAction(action, payload, actor);
}

export async function getMatchLog(
  opts: { matchId?: string; limit?: number; offset?: number } = {},
) {
  return getStore().getMatchLog(opts);
}

export async function getReceiptsPaginated(limit = 20, offset = 0) {
  return getStore().getReceiptsPaginated(limit, offset);
}

export async function getPlayersPaginated(limit = 50, offset = 0) {
  return getStore().getPlayersPaginated(limit, offset);
}

export async function getDbStats() {
  return getStore().getDbStats();
}

export async function recordBankEntry(
  entry: Omit<BankLedgerEntry, "id" | "createdAt">,
): Promise<void> {
  await getStore().recordBankEntry(createBankEntry(entry));
}

export async function getBankLedger(
  opts: {
    limit?: number;
    offset?: number;
    matchId?: string;
    type?: BankLedgerType;
  } = {},
) {
  return getStore().getBankLedger(opts);
}

export async function sumBankLedgerLamports(opts: {
  types: BankLedgerType[];
  wallet?: string;
  since?: number;
}): Promise<number> {
  return getStore().sumBankLedgerLamports(opts);
}

export async function createAdminSession(
  session: Parameters<ReturnType<typeof getStore>["createSession"]>[0],
): Promise<void> {
  await getStore().createSession(session);
}

export async function getAdminSession(token: string) {
  return getStore().getSession(token);
}

export async function deleteAdminSession(token: string): Promise<void> {
  await getStore().deleteSession(token);
}

export async function createPlayerSession(
  session: Parameters<ReturnType<typeof getStore>["createPlayerSession"]>[0],
): Promise<void> {
  await getStore().createPlayerSession(session);
}

export async function getPlayerSession(token: string) {
  return getStore().getPlayerSession(token);
}

export async function deletePlayerSession(token: string): Promise<void> {
  await getStore().deletePlayerSession(token);
}

export async function recordSiteVisit(visitorId: string): Promise<void> {
  await getStore().recordSiteVisit(visitorId);
}

export async function getDailyVisits(days: number) {
  return getStore().getDailyVisits(days);
}

export async function getClientsWithStats(
  opts: Parameters<ReturnType<typeof getStore>["getClientsWithStats"]>[0],
) {
  return getStore().getClientsWithStats(opts);
}

export async function getClientDetail(wallet: string) {
  return getStore().getClientDetail(wallet);
}

export async function getGameModeStats() {
  return getStore().getGameModeStats();
}

export async function getRecentGames(limit: number) {
  return getStore().getRecentGames(limit);
}

export function persistActiveMatch(
  snapshot: import("./database/types").PersistedActiveMatch,
): void {
  void getStore()
    .upsertActiveMatch(snapshot)
    .catch((err) => console.error("[db] persistActiveMatch failed", err));
}

export function clearActiveMatch(matchId: string): void {
  void getStore()
    .deleteActiveMatch(matchId)
    .catch((err) => console.error("[db] clearActiveMatch failed", err));
}

export async function listActiveMatches() {
  return getStore().listActiveMatches();
}

export async function consumeRateLimit(
  key: string,
  windowMs: number,
  max: number,
): Promise<boolean> {
  return getStore().consumeRateLimit(key, windowMs, max);
}

export async function revokePlayerSessions(wallet: string): Promise<void> {
  await getStore().revokePlayerSessions(wallet);
}

export async function createGuestSession(
  session: GuestSessionRecord,
): Promise<void> {
  await getStore().createGuestSession(session);
}

export async function getGuestSession(token: string) {
  return getStore().getGuestSession(token);
}

export async function bindGuestSessionSocket(
  token: string,
  socketId: string,
): Promise<boolean> {
  return getStore().bindGuestSessionSocket(token, socketId);
}

export async function releaseGuestSessionSocket(socketId: string): Promise<void> {
  await getStore().releaseGuestSessionSocket(socketId);
}
