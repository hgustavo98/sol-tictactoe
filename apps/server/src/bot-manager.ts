import type { Server } from "socket.io";
import {
  CASUAL_GHOST_PERSONAS,
  botInMatch,
  DRAW_NOT_ALLOWED_ERROR,
  getServerOpponentPersona,
  isServerOpponentWallet,
  usesStrictDrawPolicy,
  walletForCasualGhostPersona,
  SOCKET_EVENTS,
  type BotPersona,
  type LobbyMatch,
} from "@sol-tictactoe/shared";
import { getStore } from "./database";
import { config } from "./config";
import { getBotCapacity } from "./bot-capacity";
import { matchManager } from "./match-manager";
import { pickEngineMove, probeStockfish } from "./stockfish-engine";

function isIdleCasualGhostLobby(lobby: LobbyMatch): boolean {
  return (
    lobby.status === "waiting" &&
    !lobby.player2 &&
    lobby.betLamports === 0 &&
    !lobby.ranked &&
    !lobby.tournamentId &&
    lobby.gameMode !== "custom1v1" &&
    isServerOpponentWallet(lobby.player1)
  );
}

function shufflePersonas(
  pool: readonly BotPersona[],
  seed: number,
): BotPersona[] {
  const arr = [...pool];
  let state = seed >>> 0;
  const rnd = () => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class BotManager {
  private timers = new Map<string, NodeJS.Timeout>();
  private refreshTimer?: NodeJS.Timeout;
  private presenceDebounce?: NodeJS.Timeout;
  private io: Server | null = null;
  private rotationSeed = Date.now();
  private lastCapacityLog = "";

  bind(io: Server): void {
    this.io = io;
  }

  async start(): Promise<void> {
    if (!config.botCasualLobbiesEnabled) {
      console.log("[bots] Casual bot lobbies disabled");
      return;
    }

    try {
      await probeStockfish();
    } catch (err) {
      console.warn(
        "[bots] Stockfish probe failed:",
        err instanceof Error ? err.message : err,
      );
    }

    try {
      await this.seedProfiles();
    } catch (err) {
      console.warn(
        "[bots] seed profiles failed:",
        err instanceof Error ? err.message : err,
      );
    }

    this.refreshGhostLobbies();
    this.refreshTimer = setInterval(
      () => this.refreshGhostLobbies(),
      config.botCasualRotationMs,
    );
    console.log(
      `[bots] Casual ghost tables active (pool ${CASUAL_GHOST_PERSONAS.length}, up to ${config.botCasualMaxTables} when idle, dynamic scale from load, rotate every ${config.botCasualRotationMs / 1000}s)`,
    );
  }

  stop(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.presenceDebounce) clearTimeout(this.presenceDebounce);
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  /** Reconcile ghost tables when audience size changes (debounced). */
  onPresenceChanged(): void {
    if (!config.botCasualLobbiesEnabled || !this.io) return;
    if (this.presenceDebounce) clearTimeout(this.presenceDebounce);
    this.presenceDebounce = setTimeout(() => {
      this.presenceDebounce = undefined;
      this.refreshGhostLobbies();
    }, 2_000);
  }

  private currentMaxTables(): number {
    const capacity = getBotCapacity();
    const summary = `${capacity.maxTables}/${capacity.ceiling} load=${capacity.loadScore} sockets=${capacity.connectedSockets} botGames=${capacity.activeBotMatches}`;
    if (summary !== this.lastCapacityLog) {
      this.lastCapacityLog = summary;
      console.log(`[bots] capacity ${summary}`);
    }
    return capacity.maxTables;
  }

  onGameStarted(matchId: string): void {
    this.scheduleMove(matchId);
  }

  onGameUpdated(matchId: string): void {
    this.scheduleMove(matchId);
  }

  onGameFinished(): void {
    this.refreshGhostLobbies();
  }

  private async seedProfiles(): Promise<void> {
    const store = getStore();
    for (const persona of CASUAL_GHOST_PERSONAS) {
      const wallet = walletForCasualGhostPersona(persona);
      try {
        await store.seedBotProfile(wallet, {
          nickname: persona.nickname,
          rating: persona.rating,
          gamesPlayed: persona.seedGamesPlayed,
          wins: persona.seedWins,
          losses: persona.seedLosses,
          draws: persona.seedDraws,
          avatarUrl: persona.avatarUrl ?? null,
        });
      } catch (err) {
        console.warn(
          `[bots] failed to seed profile ${wallet.slice(0, 16)}…:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  /** Top up ghost tables when the lobby list is empty (e.g. after cold start). */
  ensureGhostLobbies(): void {
    if (!config.botCasualLobbiesEnabled || !this.io) return;
    const maxTables = this.currentMaxTables();
    if (maxTables === 0) {
      this.refreshGhostLobbies();
      return;
    }
    const ghostCount = matchManager
      .listLobbies()
      .filter(isIdleCasualGhostLobby).length;
    const target = Math.min(3, maxTables);
    if (ghostCount < target) {
      this.refreshGhostLobbies();
    }
  }

  /** Keeps a rotating subset of ghost tables instead of all personas at once. */
  refreshGhostLobbies(): void {
    if (!config.botCasualLobbiesEnabled || !this.io) return;

    const maxTables = this.currentMaxTables();
    this.rotationSeed += 1;
    const activePersonas =
      maxTables > 0
        ? shufflePersonas(CASUAL_GHOST_PERSONAS, this.rotationSeed).slice(
            0,
            maxTables,
          )
        : [];
    const activeWallets = new Set(
      activePersonas.map((persona) => walletForCasualGhostPersona(persona)),
    );

    const now = Date.now();
    let changed = false;

    const idleGhostLobbies = matchManager
      .listLobbies()
      .filter(isIdleCasualGhostLobby)
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const lobby of idleGhostLobbies) {
      const inRotation = activeWallets.has(lobby.player1);
      const age = now - lobby.createdAt;
      const shouldCancel =
        maxTables === 0 ||
        (!inRotation && age >= config.botCasualMinTableAgeMs) ||
        age >= config.botCasualRotationMs * 2;
      if (!shouldCancel) continue;

      try {
        matchManager.cancelLobby(lobby.id, lobby.player1);
        changed = true;
      } catch (err) {
        console.warn(
          `[bots] failed to rotate out table ${lobby.id.slice(0, 8)}…:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    const remainingGhosts = matchManager
      .listLobbies()
      .filter(isIdleCasualGhostLobby)
      .sort((a, b) => a.createdAt - b.createdAt);
    if (remainingGhosts.length > maxTables) {
      for (const lobby of remainingGhosts.slice(maxTables)) {
        try {
          matchManager.cancelLobby(lobby.id, lobby.player1);
          changed = true;
        } catch (err) {
          console.warn(
            `[bots] failed to trim table ${lobby.id.slice(0, 8)}…:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }

    for (const persona of activePersonas) {
      const wallet = walletForCasualGhostPersona(persona);
      if (matchManager.listHostWaitingLobbies(wallet).length > 0) continue;

      try {
        matchManager.createLobby({
          player1: wallet,
          betLamports: 0,
          gameMode: "casual1v1",
          ranked: false,
          player1Rating: persona.rating,
        });
        changed = true;
      } catch (err) {
        console.warn(
          `[bots] failed to open table for ${wallet.slice(0, 16)}…:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    if (changed) {
      this.io.emit(SOCKET_EVENTS.LOBBY_UPDATE, matchManager.listLobbies());
    }
  }

  private scheduleMove(matchId: string): void {
    if (!this.io) return;
    if (this.timers.has(matchId)) return;

    const state = matchManager.getGame(matchId);
    if (!state || state.status !== "playing") return;

    const opponentWallet = botInMatch(state.playerWhite, state.playerBlack);
    if (!opponentWallet) return;

    const persona = getServerOpponentPersona(opponentWallet);
    if (!persona) return;

    const turnWallet =
      state.turn === "w" ? state.playerWhite : state.playerBlack;
    if (turnWallet !== opponentWallet) return;

    const timer = setTimeout(() => {
      this.timers.delete(matchId);
      void this.playOpponentMove(matchId, opponentWallet, persona);
    }, persona.thinkDelayMs);

    this.timers.set(matchId, timer);
  }

  private async playOpponentMove(
    matchId: string,
    opponentWallet: string,
    persona: NonNullable<ReturnType<typeof getServerOpponentPersona>>,
  ): Promise<void> {
    if (!this.io) return;

    const state = matchManager.getGame(matchId);
    if (!state || state.status !== "playing") return;

    const turnWallet =
      state.turn === "w" ? state.playerWhite : state.playerBlack;
    if (turnWallet !== opponentWallet) return;

    try {
      const lobby = matchManager.getLobby(matchId);
      const strictDraw = lobby
        ? usesStrictDrawPolicy({
            betLamports: lobby.betLamports,
            tournamentId: lobby.tournamentId,
          })
        : false;

      let move = await pickEngineMove(state.fen, persona, strictDraw);
      if (!move) return;

      let result;
      try {
        result = await matchManager.makeMove(matchId, opponentWallet, move);
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        if (code !== DRAW_NOT_ALLOWED_ERROR) throw err;
        move = await pickEngineMove(state.fen, persona, true);
        if (!move) return;
        result = await matchManager.makeMove(matchId, opponentWallet, move);
      }
      this.io.to(matchId).emit(SOCKET_EVENTS.GAME_STATE, result.state);

      if (result.ended) {
        this.onGameFinished();
      } else {
        this.scheduleMove(matchId);
      }
    } catch (err) {
      const label = persona.nickname || opponentWallet.slice(0, 14);
      console.error(
        `[bots] move failed for ${label}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

export const botManager = new BotManager();
