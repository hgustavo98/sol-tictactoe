import { isCustomMode, type GameModeId } from "./economics";
import type { LobbyMatch } from "./index";

export const LOBBY_CANCEL_REFUND_WAIT_SECS = 90;
export const LOBBY_CANCEL_REFUND_WAIT_MS = LOBBY_CANCEL_REFUND_WAIT_SECS * 1000;

export function isRankedLobby(_lobby: {
  ranked?: boolean;
  gameMode?: string;
}): boolean {
  return false;
}

export function lobbyMatchPool(lobby: {
  gameMode?: string;
  betLamports?: number;
}): string {
  if (lobby.gameMode === "custom1v1") return "custom1v1";
  return "casual1v1";
}

export function gameModeToMatchPool(mode: GameModeId): string {
  if (isCustomMode(mode)) return "custom1v1";
  return "casual1v1";
}

export function lobbiesCompatibleForJoin(
  lobby: { gameMode?: string; betLamports?: number },
  input: { gameMode?: string; betLamports?: number },
): boolean {
  const poolA = lobbyMatchPool(lobby);
  const poolB = lobbyMatchPool(input);
  if (poolA !== poolB) return false;
  if (poolA === "custom1v1") {
    return lobby.betLamports === input.betLamports;
  }
  return true;
}

export interface FindJoinableLobbyInput {
  lobbies: LobbyMatch[];
  wallet: string;
  gameMode?: GameModeId;
  betLamports?: number;
  ranked?: boolean;
  playerRating?: number;
}

export function findJoinableLobby(input: FindJoinableLobbyInput): LobbyMatch | null {
  const { lobbies, wallet, gameMode, betLamports } = input;
  return (
    lobbies.find(
      (l) =>
        l.status === "waiting" &&
        !l.player2 &&
        l.player1 !== wallet &&
        lobbiesCompatibleForJoin(l, { gameMode, betLamports }),
    ) ?? null
  );
}

export function findPersonalWaitingLobby(
  lobbies: LobbyMatch[],
  wallet: string,
): LobbyMatch | null {
  return (
    lobbies.find(
      (l) => l.status === "waiting" && !l.player2 && l.player1 === wallet,
    ) ?? null
  );
}

export function ratingGap(_a: number, _b: number): number {
  return 0;
}

export function isRatingGapAcceptable(_gap: number): boolean {
  return true;
}

export function countRankedOpenLobbies(_lobbies: LobbyMatch[], _betLamports?: number): number {
  return 0;
}
