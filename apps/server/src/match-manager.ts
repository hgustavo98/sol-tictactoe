import { randomUUID } from "crypto";
import {
  assertGuestLobbyAccess,
  clockIncrementMsForLobby,
  clockMsForLobby,
  computeBetBreakdown,
  CUSTOM_MIN_BET_SOL,
  isGuestWallet,
  isServerOpponentWallet,
  MIN_BET_LAMPORTS,
  isRankedMode,
  rankedStakeMultiplier,
  RATING_MAX_OPEN_JOIN,
  RECONNECT_GRACE_MS,
  WAITING_ROOM_DISCONNECT_GRACE_MS,
  DEFAULT_RATING,
  findJoinableLobby as pickJoinableLobby,
  lobbiesCompatibleForJoin,
  resolveLobbyEconomics,
  assertModeAvailable,
  resolveLobbyGameMode,
  tournamentRatingMultiplierFromEntry,
  DRAW_NOT_ALLOWED_ERROR,
  usesStrictDrawPolicy,
  type FindJoinableLobbyInput,
  type GameEndReason,
  type GameModeId,
  type GameState,
  type LobbyMatch,
  type RatingDelta,
} from "@sol-tictactoe/shared";
import { TictactoeEngine, colorForWallet, simulateMove } from "./tictactoe-engine";
import { config } from "./config";
import { logMatchEvent, persistActiveMatch, clearActiveMatch, listActiveMatches } from "./db";
import { settleMatchOnChain, isPaidLobbyJoinableOnChain } from "./escrow-client";
import { persistGameReceipt } from "./receipt";
import { applyGameRatings, getPlayerRating } from "./rating";
import { getModeAvailability, getRuntimeConfig } from "./settings";

interface ActiveGame {
  lobby: LobbyMatch;
  engine: TictactoeEngine;
  whiteTimeMs: number;
  blackTimeMs: number;
  incrementMs: number;
  lastTickAt: number;
  interval?: ReturnType<typeof setInterval>;
  disconnectedPlayer?: string;
  reconnectDeadlineMs?: number;
  clockPaused?: boolean;
}

interface WaitingGrace {
  wallet: string;
  deadlineMs: number;
}

type GameEndResult = Awaited<ReturnType<MatchManager["endGame"]>>;
type GameEndNotifier = (matchId: string, result: GameEndResult) => void;

export class MatchManager {
  private lobbies = new Map<string, LobbyMatch>();
  private games = new Map<string, ActiveGame>();
  private waitingGrace = new Map<string, WaitingGrace>();
  private onGameEnd?: GameEndNotifier;

  setGameEndNotifier(notifier: GameEndNotifier): void {
    this.onGameEnd = notifier;
  }

  /** Reload lobbies and in-progress games from MongoDB after a restart. */
  async recoverFromDatabase(): Promise<{ lobbies: number; games: number }> {
    const snapshots = await listActiveMatches();
    let lobbies = 0;
    let games = 0;

    for (const snap of snapshots) {
      if (snap.kind === "lobby") {
        const terminal =
          snap.lobby.status === "cancelled" ||
          snap.lobby.status === "settled" ||
          snap.lobby.status === "draw";
        if (terminal) {
          clearActiveMatch(snap.matchId);
          continue;
        }

        if (snap.waitingGrace && snap.waitingGrace.deadlineMs <= Date.now()) {
          clearActiveMatch(snap.matchId);
          logMatchEvent(snap.matchId, "lobby_abandoned", {
            wallet: snap.waitingGrace.wallet,
            recovered: true,
          });
          continue;
        }

        this.lobbies.set(snap.matchId, { ...snap.lobby });
        if (snap.waitingGrace) {
          this.waitingGrace.set(snap.matchId, { ...snap.waitingGrace });
        }
        lobbies += 1;
        continue;
      }

      if (snap.kind !== "playing" || !snap.fen || !snap.lobby.player2) {
        clearActiveMatch(snap.matchId);
        continue;
      }

      if (snap.lobby.status !== "playing") {
        clearActiveMatch(snap.matchId);
        continue;
      }

      const engine = new TictactoeEngine(snap.fen);
      const active: ActiveGame = {
        lobby: { ...snap.lobby },
        engine,
        whiteTimeMs: snap.whiteTimeMs ?? clockMsForLobby(snap.lobby),
        blackTimeMs: snap.blackTimeMs ?? clockMsForLobby(snap.lobby),
        incrementMs: snap.incrementMs ?? clockIncrementMsForLobby(snap.lobby),
        lastTickAt: snap.lastTickAt ?? Date.now(),
        disconnectedPlayer: snap.disconnectedPlayer,
        reconnectDeadlineMs: snap.reconnectDeadlineMs,
        clockPaused: snap.clockPaused,
      };

      const now = Date.now();

      if (
        active.reconnectDeadlineMs &&
        active.disconnectedPlayer &&
        now >= active.reconnectDeadlineMs
      ) {
        const loser = active.disconnectedPlayer;
        const winner =
          loser === active.lobby.player1
            ? active.lobby.player2
            : active.lobby.player1;
        this.lobbies.set(snap.matchId, active.lobby);
        this.games.set(snap.matchId, active);
        try {
          await this.finishGame(snap.matchId, winner, "disconnect");
        } catch (err) {
          console.error("[recovery] disconnect finish failed", err);
        }
        clearActiveMatch(snap.matchId);
        continue;
      }

      if (!active.clockPaused) {
        const elapsed = now - active.lastTickAt;
        active.lastTickAt = now;
        if (engine.turn() === "w") {
          active.whiteTimeMs = Math.max(0, active.whiteTimeMs - elapsed);
          if (active.whiteTimeMs === 0) {
            this.lobbies.set(snap.matchId, active.lobby);
            this.games.set(snap.matchId, active);
            try {
              await this.finishGame(snap.matchId, active.lobby.player2!, "timeout");
            } catch (err) {
              console.error("[recovery] white timeout finish failed", err);
            }
            clearActiveMatch(snap.matchId);
            continue;
          }
        } else {
          active.blackTimeMs = Math.max(0, active.blackTimeMs - elapsed);
          if (active.blackTimeMs === 0) {
            this.lobbies.set(snap.matchId, active.lobby);
            this.games.set(snap.matchId, active);
            try {
              await this.finishGame(snap.matchId, active.lobby.player1, "timeout");
            } catch (err) {
              console.error("[recovery] black timeout finish failed", err);
            }
            clearActiveMatch(snap.matchId);
            continue;
          }
        }
      }

      this.lobbies.set(snap.matchId, active.lobby);
      active.interval = setInterval(() => this.tickClock(snap.matchId), 1000);
      this.games.set(snap.matchId, active);
      games += 1;
    }

    return { lobbies, games };
  }

  private persistLobbyState(matchId: string): void {
    const lobby = this.lobbies.get(matchId);
    if (!lobby) {
      clearActiveMatch(matchId);
      return;
    }
    if (lobby.status === "playing") {
      this.persistPlayingState(matchId);
      return;
    }
    if (
      lobby.status === "cancelled" ||
      lobby.status === "settled" ||
      lobby.status === "draw"
    ) {
      clearActiveMatch(matchId);
      return;
    }

    const grace = this.waitingGrace.get(matchId);
    persistActiveMatch({
      matchId,
      kind: "lobby",
      lobby: { ...lobby },
      waitingGrace: grace ? { ...grace } : undefined,
      updatedAt: Date.now(),
    });
  }

  private persistPlayingState(matchId: string): void {
    const active = this.games.get(matchId);
    if (!active || active.lobby.status !== "playing") {
      this.persistLobbyState(matchId);
      return;
    }

    persistActiveMatch({
      matchId,
      kind: "playing",
      lobby: { ...active.lobby },
      fen: active.engine.fen(),
      moves: active.engine.history(),
      whiteTimeMs: active.whiteTimeMs,
      blackTimeMs: active.blackTimeMs,
      incrementMs: active.incrementMs,
      lastTickAt: active.lastTickAt,
      disconnectedPlayer: active.disconnectedPlayer,
      reconnectDeadlineMs: active.reconnectDeadlineMs,
      clockPaused: active.clockPaused,
      updatedAt: Date.now(),
    });
  }

  activeMatchIds(): string[] {
    return Array.from(this.games.keys());
  }

  listLobbies(): LobbyMatch[] {
    return Array.from(this.lobbies.values())
      .filter((l) => {
        if (l.status !== "waiting" && l.status !== "funded") return false;
        const grace = this.waitingGrace.get(l.id);
        if (grace && Date.now() >= grace.deadlineMs) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  findActiveMatchForWallet(wallet: string): string | undefined {
    for (const [matchId, active] of this.games) {
      if (active.lobby.status !== "playing") continue;
      if (
        active.lobby.player1 === wallet ||
        active.lobby.player2 === wallet
      ) {
        return matchId;
      }
    }
    return undefined;
  }

  findWaitingLobbyForWallet(wallet: string): LobbyMatch | undefined {
    for (const lobby of this.lobbies.values()) {
      if (
        lobby.player1 === wallet &&
        lobby.status === "waiting" &&
        !lobby.player2
      ) {
        return lobby;
      }
      if (
        lobby.player2 === wallet &&
        (lobby.status === "joined" || lobby.status === "funded")
      ) {
        return lobby;
      }
    }
    return undefined;
  }

  getLobby(id: string): LobbyMatch | undefined {
    return this.lobbies.get(id);
  }

  findJoinableLobby(input: Omit<FindJoinableLobbyInput, "lobbies">): LobbyMatch | undefined {
    return pickJoinableLobby({ ...input, lobbies: this.listLobbies() }) ?? undefined;
  }

  /** Host-owned open tables, including those hidden from listLobbies() during grace. */
  listHostWaitingLobbies(wallet: string): LobbyMatch[] {
    return Array.from(this.lobbies.values()).filter(
      (lobby) =>
        lobby.player1 === wallet &&
        lobby.status === "waiting" &&
        !lobby.player2,
    );
  }

  createLobby(input: {
    id?: string;
    player1: string;
    betLamports: number;
    tokenMint?: string | null;
    onChainAddress?: string;
    ranked?: boolean;
    tournamentId?: string;
    bracketMatchId?: string;
    gameMode?: GameModeId;
    rakeBps?: number;
    player1Rating?: number;
  }): LobbyMatch {
    const mode: GameModeId =
      input.gameMode ??
      (input.betLamports === 0 ? "casual1v1" : "custom1v1");

    if (input.betLamports === 0) {
      if (mode !== "casual1v1") {
        throw new Error("Free play is only available in casual mode");
      }
    } else if (input.betLamports < MIN_BET_LAMPORTS) {
      throw new Error(`Minimum bet is ${CUSTOM_MIN_BET_SOL} SOL`);
    }

    if (input.tournamentId && !input.gameMode) {
      throw new Error("gameMode is required for tournament matches");
    }

    assertGuestLobbyAccess(input.player1, {
      gameMode: mode,
      betLamports: input.betLamports,
      ranked: input.ranked,
      tournamentId: input.tournamentId,
    });
    assertModeAvailable(mode, getModeAvailability());

    const economics =
      input.betLamports === 0
        ? { rakeBps: 0, gameMode: "casual1v1" as GameModeId }
        : resolveLobbyEconomics(mode, input.betLamports);
    const rakeBps = input.rakeBps ?? economics.rakeBps;

    if (rakeBps !== economics.rakeBps) {
      throw new Error("Invalid rake for game mode");
    }

    if (input.id) {
      const existingById = this.lobbies.get(input.id);
      if (
        existingById &&
        existingById.player1 === input.player1 &&
        existingById.status === "waiting" &&
        !existingById.player2
      ) {
        return existingById;
      }
    }

    if (!input.tournamentId && !input.bracketMatchId) {
      for (const lobby of this.lobbies.values()) {
        if (
          lobby.player1 === input.player1 &&
          lobby.status === "waiting" &&
          !lobby.player2
        ) {
          throw new Error("You already have an open table");
        }
      }
    }

    const id = input.id ?? randomUUID();
    const lobby: LobbyMatch = {
      id,
      player1: input.player1,
      betLamports: input.betLamports,
      tokenMint: input.tokenMint ?? null,
      status: "waiting",
      onChainAddress: input.onChainAddress,
      createdAt: Date.now(),
      player1Rating: input.player1Rating ?? DEFAULT_RATING,
      ranked: input.ranked ?? isRankedMode(mode),
      tournamentId: input.tournamentId,
      bracketMatchId: input.bracketMatchId,
      rakeBps,
      gameMode: economics.gameMode,
    };
    this.lobbies.set(id, lobby);
    logMatchEvent(id, "lobby_created", lobby);
    this.persistLobbyState(id);
    return lobby;
  }

  cancelLobby(id: string, wallet: string): LobbyMatch {
    const lobby = this.lobbies.get(id);
    if (!lobby) throw new Error("Lobby not found");
    if (lobby.player1 !== wallet) {
      throw new Error("Only the host can cancel this lobby");
    }
    if (lobby.status !== "waiting") {
      throw new Error("Lobby cannot be cancelled in its current state");
    }
    lobby.status = "cancelled";
    this.lobbies.delete(id);
    this.waitingGrace.delete(id);
    logMatchEvent(id, "lobby_cancelled", { wallet });
    clearActiveMatch(id);
    return lobby;
  }

  /** Host closed waiting room — cancels every open table they host (no opponent yet). */
  cancelAllHostWaitingLobbies(
    wallet: string,
    keepId?: string,
  ): LobbyMatch[] {
    const cancelled: LobbyMatch[] = [];
    for (const lobby of Array.from(this.lobbies.values())) {
      if (
        lobby.player1 !== wallet ||
        lobby.status !== "waiting" ||
        lobby.player2 ||
        (keepId && lobby.id === keepId)
      ) {
        continue;
      }
      lobby.status = "cancelled";
      this.lobbies.delete(lobby.id);
      this.waitingGrace.delete(lobby.id);
      logMatchEvent(lobby.id, "lobby_cancelled", { wallet });
      clearActiveMatch(lobby.id);
      cancelled.push(lobby);
    }
    return cancelled;
  }

  /** Joiner backed out before the match started — table returns to open waiting. */
  leaveWaitingLobby(matchId: string, wallet: string): LobbyMatch {
    const lobby = this.lobbies.get(matchId);
    if (!lobby) throw new Error("Lobby not found");

    if (
      lobby.player1 === wallet &&
      lobby.status === "waiting" &&
      !lobby.player2
    ) {
      return this.cancelLobby(matchId, wallet);
    }

    if (
      lobby.player2 === wallet &&
      (lobby.status === "joined" || lobby.status === "funded")
    ) {
      lobby.player2 = undefined;
      lobby.player2Rating = undefined;
      lobby.status = "waiting";
      logMatchEvent(matchId, "lobby_joiner_left", { wallet });
      this.persistLobbyState(matchId);
      return lobby;
    }

    throw new Error("Cannot leave this lobby");
  }

  /** Remove paid waiting lobbies that are no longer joinable on-chain (stale/cancelled/occupied). */
  async purgeStaleWaitingLobbies(): Promise<number> {
    const rt = getRuntimeConfig();
    if (rt.mockEscrow) return 0;

    const minAgeMs = 60_000;
    const now = Date.now();
    let removed = 0;
    for (const lobby of Array.from(this.lobbies.values())) {
      if (
        lobby.status !== "waiting" ||
        lobby.player2 ||
        lobby.betLamports === 0 ||
        !lobby.onChainAddress ||
        now - lobby.createdAt < minAgeMs
      ) {
        continue;
      }

      const joinable = await isPaidLobbyJoinableOnChain({
        matchId: lobby.id,
        gamePubkey: lobby.onChainAddress,
        betLamports: lobby.betLamports,
        rakeBps: lobby.rakeBps,
      }).catch(() => false);

      if (joinable) continue;

      lobby.status = "cancelled";
      this.lobbies.delete(lobby.id);
      this.waitingGrace.delete(lobby.id);
      logMatchEvent(lobby.id, "lobby_stale_purged", {
        onChainAddress: lobby.onChainAddress,
      });
      clearActiveMatch(lobby.id);
      removed += 1;
    }
    return removed;
  }

  async joinLobby(
    id: string,
    player2: string,
    onChainAddress?: string,
    joinerGameMode?: GameModeId,
  ): Promise<LobbyMatch> {
    const lobby = this.lobbies.get(id);
    if (!lobby) throw new Error("Lobby not found");
    if (lobby.status !== "waiting") throw new Error("Lobby not available");
    if (lobby.player1 === player2) throw new Error("Cannot join own lobby");
    if (lobby.player2) throw new Error("Lobby not available");

    assertModeAvailable(resolveLobbyGameMode(lobby), getModeAvailability());

    if (isGuestWallet(player2) && lobby.betLamports > 0) {
      throw new Error("Guests can only join free casual lobbies");
    }

    if (
      joinerGameMode &&
      !lobbiesCompatibleForJoin(lobby, {
        gameMode: joinerGameMode,
        betLamports: lobby.betLamports,
      })
    ) {
      throw new Error("This table is for a different game mode");
    }

    // Reserve the slot before async rating lookup to avoid double-join races.
    lobby.player2 = player2;
    lobby.status = lobby.betLamports > 0 ? "joined" : "funded";
    if (
      onChainAddress &&
      lobby.onChainAddress &&
      onChainAddress !== lobby.onChainAddress
    ) {
      throw new Error("onChainAddress mismatch for this table");
    }

    try {
      const joinerRating = await getPlayerRating(player2);
      const creatorRating =
        lobby.player1Rating ?? (await getPlayerRating(lobby.player1));
      const gap = Math.abs(joinerRating - creatorRating);

      if (lobby.ranked && gap > RATING_MAX_OPEN_JOIN) {
        throw new Error(
          `Rating gap too large (${gap} pts). Ranked tables need opponents within ${RATING_MAX_OPEN_JOIN} points.`,
        );
      }

      lobby.player2Rating = joinerRating;
      if (!lobby.player1Rating) {
        lobby.player1Rating = creatorRating;
      }
      logMatchEvent(id, "lobby_joined", { player2 });
      this.persistLobbyState(id);
      return lobby;
    } catch (err) {
      lobby.player2 = undefined;
      lobby.player2Rating = undefined;
      lobby.status = "waiting";
      throw err;
    }
  }

  markFunded(id: string): LobbyMatch {
    const lobby = this.lobbies.get(id);
    if (!lobby) throw new Error("Lobby not found");
    lobby.status = "funded";
    this.persistLobbyState(id);
    return lobby;
  }

  startGame(lobbyId: string): GameState {
    const existing = this.games.get(lobbyId);
    if (existing) return this.toGameState(existing);

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby?.player2) throw new Error("Lobby not ready");

    const clockMs = clockMsForLobby(lobby);
    const incrementMs = clockIncrementMsForLobby(lobby);
    const engine = new TictactoeEngine();
    const rakeBps = lobby.rakeBps ?? config.houseRakeBps;
    const breakdown = computeBetBreakdown(lobby.betLamports, rakeBps);

    const active: ActiveGame = {
      lobby: { ...lobby, status: "playing" },
      engine,
      whiteTimeMs: clockMs,
      blackTimeMs: clockMs,
      incrementMs,
      lastTickAt: Date.now(),
    };
    active.interval = setInterval(() => this.tickClock(lobbyId), 1000);
    this.games.set(lobbyId, active);
    lobby.status = "playing";
    this.waitingGrace.delete(lobbyId);

    const state: GameState = {
      matchId: lobby.id,
      fen: engine.fen(),
      turn: engine.turn(),
      playerWhite: lobby.player1,
      playerBlack: lobby.player2,
      betLamports: lobby.betLamports,
      potLamports: breakdown.potLamports,
      rakeBps,
      moves: [],
      status: "playing",
      whiteTimeMs: clockMs,
      blackTimeMs: clockMs,
      incrementMs,
    };

    logMatchEvent(lobbyId, "game_started", { ...state, clockMs, incrementMs });
    this.persistPlayingState(lobbyId);
    return state;
  }

  getGame(matchId: string): GameState | undefined {
    const active = this.games.get(matchId);
    if (!active) return undefined;
    return this.toGameState(active);
  }

  private toGameState(active: ActiveGame): GameState {
    const { lobby, engine, whiteTimeMs, blackTimeMs, incrementMs } = active;
    const rakeBps = lobby.rakeBps ?? config.houseRakeBps;
    const breakdown = computeBetBreakdown(lobby.betLamports, rakeBps);
    return {
      matchId: lobby.id,
      fen: engine.fen(),
      turn: engine.turn(),
      playerWhite: lobby.player1,
      playerBlack: lobby.player2!,
      betLamports: lobby.betLamports,
      potLamports: breakdown.potLamports,
      rakeBps,
      moves: engine.history(),
      status: lobby.status,
      whiteTimeMs,
      blackTimeMs,
      incrementMs: incrementMs || undefined,
      disconnectedPlayer: active.disconnectedPlayer,
      reconnectDeadlineMs: active.reconnectDeadlineMs,
    };
  }

  handlePlayerLeave(wallet: string, matchId?: string): GameState[] {
    const updated: GameState[] = [];

    for (const lobby of this.lobbies.values()) {
      if (
        lobby.status === "waiting" &&
        !lobby.player2 &&
        lobby.player1 === wallet &&
        !isServerOpponentWallet(wallet)
      ) {
        this.waitingGrace.set(lobby.id, {
          wallet,
          deadlineMs: Date.now() + WAITING_ROOM_DISCONNECT_GRACE_MS,
        });
        this.persistLobbyState(lobby.id);
      }
    }

    for (const [id, active] of this.games) {
      if (matchId && id !== matchId) continue;
      if (active.lobby.status !== "playing") continue;
      if (
        wallet !== active.lobby.player1 &&
        wallet !== active.lobby.player2
      ) {
        continue;
      }
      if (active.disconnectedPlayer === wallet) continue;

      active.disconnectedPlayer = wallet;
      active.reconnectDeadlineMs = Date.now() + RECONNECT_GRACE_MS;
      active.clockPaused = true;
      active.lastTickAt = Date.now();
      logMatchEvent(id, "player_disconnected", { wallet });
      this.persistPlayingState(id);
      updated.push(this.toGameState(active));
    }

    return updated;
  }

  handlePlayerReconnect(wallet: string, matchId?: string): GameState[] {
    const updated: GameState[] = [];

    for (const [lobbyId, grace] of this.waitingGrace) {
      if (grace.wallet === wallet) {
        this.waitingGrace.delete(lobbyId);
        this.persistLobbyState(lobbyId);
      }
    }

    for (const [id, active] of this.games) {
      if (matchId && id !== matchId) continue;
      if (active.disconnectedPlayer !== wallet) continue;

      active.disconnectedPlayer = undefined;
      active.reconnectDeadlineMs = undefined;
      active.clockPaused = false;
      active.lastTickAt = Date.now();
      logMatchEvent(id, "player_reconnected", { wallet });
      this.persistPlayingState(id);
      updated.push(this.toGameState(active));
    }

    return updated;
  }

  processGraceTimeouts(): LobbyMatch[] {
    const abandonedLobbies: LobbyMatch[] = [];
    const now = Date.now();

    for (const [lobbyId, grace] of this.waitingGrace) {
      if (now < grace.deadlineMs) continue;
      const lobby = this.lobbies.get(lobbyId);
      if (lobby?.status === "waiting" && !lobby.player2) {
        abandonedLobbies.push({ ...lobby });
        lobby.status = "cancelled";
        this.lobbies.delete(lobbyId);
        logMatchEvent(lobbyId, "lobby_abandoned", { wallet: grace.wallet });
        clearActiveMatch(lobbyId);
      }
      this.waitingGrace.delete(lobbyId);
    }

    return abandonedLobbies;
  }

  private tickClock(matchId: string): void {
    const active = this.games.get(matchId);
    if (!active || active.lobby.status !== "playing") return;

    const now = Date.now();

    if (
      active.reconnectDeadlineMs &&
      active.disconnectedPlayer &&
      now >= active.reconnectDeadlineMs
    ) {
      const loser = active.disconnectedPlayer;
      const winner =
        loser === active.lobby.player1
          ? active.lobby.player2!
          : active.lobby.player1;
      void this.finishGame(matchId, winner, "disconnect").catch((err) => {
        console.error("[match] disconnect finish failed", err);
      });
      return;
    }

    if (active.clockPaused) {
      active.lastTickAt = now;
      return;
    }

    const elapsed = now - active.lastTickAt;
    active.lastTickAt = now;

    if (active.engine.turn() === "w") {
      active.whiteTimeMs = Math.max(0, active.whiteTimeMs - elapsed);
      if (active.whiteTimeMs === 0) {
        void this.finishGame(matchId, active.lobby.player2!, "timeout");
      }
    } else {
      active.blackTimeMs = Math.max(0, active.blackTimeMs - elapsed);
      if (active.blackTimeMs === 0) {
        void this.finishGame(matchId, active.lobby.player1, "timeout");
      }
    }
  }

  async makeMove(
    matchId: string,
    wallet: string,
    move: { from: string; to: string; promotion?: "q" | "r" | "b" | "n" }
  ): Promise<{ state: GameState; ended?: Awaited<ReturnType<MatchManager["endGame"]>> }> {
    const active = this.games.get(matchId);
    if (!active) throw new Error("Game not found");
    if (active.lobby.status !== "playing") throw new Error("Game not active");
    if (active.disconnectedPlayer === wallet) {
      throw new Error("Reconnect to continue playing");
    }

    const color = colorForWallet(
      wallet,
      active.lobby.player1,
      active.lobby.player2!
    );
    if (!color) throw new Error("Not a player in this match");
    if (active.engine.turn() !== color) throw new Error("Not your turn");

    const strictDraw = usesStrictDrawPolicy({
      betLamports: active.lobby.betLamports,
      tournamentId: active.lobby.tournamentId,
    });
    const trial = simulateMove(active.engine.fen(), move);
    if (!trial.ok) throw new Error("Invalid move");
    if (strictDraw && trial.engine.isGameOver() && !trial.engine.isCheckmate()) {
      const kind = trial.engine.drawKind();
      if (kind === "insufficient_material") {
        throw new Error(DRAW_NOT_ALLOWED_ERROR);
      }
    }

    active.engine.move(move);
    active.lastTickAt = Date.now();

    if (active.incrementMs > 0) {
      if (color === "w") {
        active.whiteTimeMs += active.incrementMs;
      } else {
        active.blackTimeMs += active.incrementMs;
      }
    }

    if (active.engine.isGameOver()) {
      let winner: string | undefined;
      let reason: GameEndReason = "draw";

      if (active.engine.isCheckmate()) {
        winner =
          active.engine.turn() === "w"
            ? active.lobby.player2!
            : active.lobby.player1;
        reason = "checkmate";
      } else if (active.engine.isStalemate()) {
        reason = "stalemate";
      } else if (active.engine.isInsufficientMaterial()) {
        reason = "draw";
      } else if (active.engine.isDraw()) {
        reason = "draw";
      }

      const ended = await this.finishGame(matchId, winner, reason);
      return { state: this.toGameState(active), ended };
    }

    this.persistPlayingState(matchId);
    return { state: this.toGameState(active) };
  }

  async resign(matchId: string, wallet: string) {
    const active = this.games.get(matchId);
    if (!active) throw new Error("Game not found");
    const winner =
      wallet === active.lobby.player1
        ? active.lobby.player2!
        : active.lobby.player1;
    return this.finishGame(matchId, winner, "resign");
  }

  async endGame(
    matchId: string,
    winner: string | undefined,
    reason: GameEndReason
  ) {
    const active = this.games.get(matchId);
    if (!active) throw new Error("Game not found");
    if (active.interval) clearInterval(active.interval);

    const isDraw = !winner || reason === "stalemate" || reason === "draw";
    const pgn = active.engine.pgn();
    let settleSignature: string | undefined;

    try {
      const result = await settleMatchOnChain({
        matchId,
        gamePubkey: active.lobby.onChainAddress ?? matchId,
        winner: winner ?? active.lobby.player1,
        playerWhite: active.lobby.player1,
        playerBlack: active.lobby.player2!,
        betLamports: active.lobby.betLamports,
        rakeBps: active.lobby.rakeBps ?? config.houseRakeBps,
        tokenMint: active.lobby.tokenMint,
        pgn,
        isDraw,
      });
      settleSignature = result.signature;
    } catch (err) {
      console.error("[match] settle failed", err);
      if (!getRuntimeConfig().mockEscrow && active.lobby.betLamports > 0) {
        active.interval = setInterval(() => this.tickClock(matchId), 1000);
        throw err;
      }
    }

    active.lobby.status = isDraw ? "draw" : "settled";
    active.disconnectedPlayer = undefined;
    active.reconnectDeadlineMs = undefined;
    active.clockPaused = false;
    logMatchEvent(matchId, "game_over", { winner, reason, settleSignature });

    const state = this.toGameState(active);
    state.winner = winner;
    state.endReason = reason;
    state.settleSignature = settleSignature;
    state.status = active.lobby.status;

    persistGameReceipt(matchId, state, pgn, settleSignature);
    clearActiveMatch(matchId);

    let ratingChanges: RatingDelta[] = [];
    const isTournament = Boolean(active.lobby.tournamentId);
    const countsForRating =
      active.lobby.ranked || isTournament;
    if (countsForRating) {
      const multiplier = isTournament
        ? tournamentRatingMultiplierFromEntry(active.lobby.betLamports)
        : rankedStakeMultiplier(active.lobby.betLamports);
      try {
        ratingChanges = await applyGameRatings({
          playerWhite: active.lobby.player1,
          playerBlack: active.lobby.player2!,
          winner,
          isDraw,
          multiplier,
        });
        logMatchEvent(matchId, "rating_updated", ratingChanges);
      } catch (err) {
        console.error("[match] rating update failed", err);
      }
    }

    return { state, winner, reason, settleSignature, ratingChanges };
  }

  private notifyGameEnd(
    matchId: string,
    result: GameEndResult,
  ): void {
    this.onGameEnd?.(matchId, result);
  }

  private async finishGame(
    matchId: string,
    winner: string | undefined,
    reason: GameEndReason,
  ): Promise<GameEndResult> {
    const result = await this.endGame(matchId, winner, reason);
    this.notifyGameEnd(matchId, result);
    return result;
  }
}

export const matchManager = new MatchManager();
