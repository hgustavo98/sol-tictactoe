import type { Server, Socket } from "socket.io";
import type {
  TournamentQueueStatus,
  TournamentSize,
  TournamentState,
} from "@sol-tictactoe/shared";

function emptyQueue(size: TournamentSize): TournamentQueueStatus {
  return { size, entryLamports: 0, registered: 0, needed: size, wallets: [] };
}

class TournamentManagerStub {
  listActive(): TournamentState[] {
    return [];
  }

  listAllQueueStatuses(): TournamentQueueStatus[] {
    return ([4, 6, 8, 12] as TournamentSize[]).map(emptyQueue);
  }

  queueStatus(size: TournamentSize, entryLamports = 0): TournamentQueueStatus {
    return { size, entryLamports, registered: 0, needed: size, wallets: [] };
  }

  listQueues(): TournamentQueueStatus[] {
    return this.listAllQueueStatuses();
  }

  onSocketConnect(_socket: Socket): void {
    /* tournaments disabled */
  }

  removeBySocket(_socketId: string): void {
    /* tournaments disabled */
  }

  async register(
    _wallet: string,
    _size: TournamentSize,
    _entryLamports: number,
    _socketId: string,
  ): Promise<TournamentQueueStatus> {
    throw new Error("Tournaments are not available in SOL TTT");
  }

  unregister(_wallet: string, _size?: TournamentSize): TournamentQueueStatus | null {
    return null;
  }

  async tryStart(
    _io: Server,
    _size: TournamentSize,
    _entryLamports?: number,
  ): Promise<void> {
    /* no-op */
  }

  linkGameMatch(
    _gameMatchId: string,
    _tournamentId: string,
    _bracketMatchId: string,
  ): void {
    /* no-op */
  }

  handleGameEnd(
    _io: Server,
    _matchId: string,
    _winner?: string,
  ): void {
    /* no-op */
  }

  sizeFromMode(_mode: string): TournamentSize | null {
    return null;
  }
}

export const tournamentManager = new TournamentManagerStub();
