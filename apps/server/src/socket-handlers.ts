import type { Server, Socket } from "socket.io";
import {
  assertGuestLobbyAccess,
  assertModeAvailable,
  isGuestWallet,
  modeForTournamentSize,
  resolveLobbyGameMode,
  resolveRankedModeFromBet,
  resolveLobbyEconomics,
  SOCKET_EVENTS,
  tournamentEntryLamports,
  type GameModeId,
  type LobbyMatch,
  type TournamentSize,
} from "@sol-tictactoe/shared";
import { getOrCreatePlayer } from "./db";
import { getPlayerRating } from "./rating";
import { matchManager } from "./match-manager";
import { botManager } from "./bot-manager";
import { matchmakingQueue } from "./matchmaking-queue";
import {
  registerSocketPresence,
  removeSocketPresence,
  updateSocketPresence,
} from "./presence";
import { tournamentManager } from "./tournament-manager";
import {
  closeWaitingMatchOnChain,
  getAllowedMints,
  isMintAllowed,
  verifyMatchFunded,
  deriveExpectedMatchPda,
} from "./escrow-client";
import { getModeAvailability, getRuntimeConfig } from "./settings";
import { rejectUnauthorizedWallet } from "./auth/wallet-guard";
import { socketIdentity } from "./auth/socket-identity";
import { allowSocketEvent, socketRateLimitError } from "./auth/socket-rate-limit";

export { getAllowedMints };

async function socketTooFast(
  socket: Socket,
  event: string,
  max: number,
): Promise<boolean> {
  if (await allowSocketEvent(socket.id, event, max, 60_000)) return false;
  socket.emit(SOCKET_EVENTS.GAME_ERROR, {
    message: socketRateLimitError(event),
  });
  return true;
}

function expectedLobbyRakeBps(lobby: LobbyMatch): number {
  if (lobby.rakeBps != null) return lobby.rakeBps;
  const mode: GameModeId =
    (lobby.gameMode as GameModeId | undefined) ??
    (lobby.betLamports > 0 ? "custom1v1" : "casual1v1");
  return resolveLobbyEconomics(mode, lobby.betLamports).rakeBps;
}

async function closePaidWaitingLobbiesOnChain(
  lobbies: LobbyMatch[],
): Promise<void> {
  for (const lobby of lobbies) {
    if (lobby.betLamports <= 0 || !lobby.onChainAddress) continue;
    try {
      await closeWaitingMatchOnChain({
        matchId: lobby.id,
        gamePubkey: lobby.onChainAddress,
        player1: lobby.player1,
        betLamports: lobby.betLamports,
      });
    } catch (err) {
      console.error(
        `[escrow] close waiting match ${lobby.id} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

function emitPlayerProfile(socket: Socket, wallet: string): void {
  void getOrCreatePlayer(wallet)
    .then((profile) => {
      socket.emit(SOCKET_EVENTS.PLAYER_PROFILE, profile);
      const activeMatchId = matchManager.findActiveMatchForWallet(wallet);
      if (activeMatchId) {
        const state = matchManager.getGame(activeMatchId);
        if (state?.status === "playing") {
          socket.emit(SOCKET_EVENTS.GAME_ACTIVE, {
            matchId: activeMatchId,
            state,
          });
          return;
        }
      }
      const waitingLobby = matchManager.findWaitingLobbyForWallet(wallet);
      if (waitingLobby) {
        socket.emit(SOCKET_EVENTS.LOBBY_ACTIVE, { lobby: waitingLobby });
      }
    })
    .catch((err) => console.error("[profile] emit failed", err));
}

function emitPlayerProfileUpdate(io: Server, wallet: string): void {
  void getOrCreatePlayer(wallet)
    .then((profile) => {
      io.emit(SOCKET_EVENTS.PLAYER_PROFILE_UPDATE, profile);
    })
    .catch((err) => console.error("[profile] update failed", err));
}

function trackWallet(socket: Socket, wallet: string): void {
  socket.data.wallet = wallet;
  updateSocketPresence(socket.id, { wallet });
}

function notifyMatchPlayers(
  io: Server,
  matchId: string,
  state: { playerWhite: string; playerBlack: string; matchId: string },
): void {
  const wallets = new Set([state.playerWhite, state.playerBlack]);
  for (const playerSocket of io.sockets.sockets.values()) {
    const wallet = playerSocket.data.wallet as string | undefined;
    if (!wallet || !wallets.has(wallet)) continue;
    void playerSocket.join(matchId);
    playerSocket.emit(SOCKET_EVENTS.GAME_STATE, state);
  }
  io.to(matchId).emit(SOCKET_EVENTS.GAME_STATE, state);
}

async function purgeHostWaitingDuplicates(
  wallet: string,
  keepMatchId: string,
): Promise<void> {
  const stale = matchManager.listLobbies().filter(
    (l) =>
      l.player1 === wallet &&
      l.id !== keepMatchId &&
      l.status === "waiting" &&
      !l.player2,
  );

  for (const lobby of stale) {
    if (lobby.betLamports > 0 && lobby.onChainAddress) {
      try {
        await closeWaitingMatchOnChain({
          matchId: lobby.id,
          gamePubkey: lobby.onChainAddress,
          player1: lobby.player1,
          betLamports: lobby.betLamports,
        });
      } catch (err) {
        console.error(
          `[escrow] purge stale waiting table ${lobby.id} failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  matchManager.cancelAllHostWaitingLobbies(wallet, keepMatchId);
}

async function startFundedMatch(io: Server, matchId: string) {
  const existing = matchManager.getGame(matchId);
  if (existing) {
    notifyMatchPlayers(io, matchId, existing);
    return existing;
  }

  const lobby = matchManager.getLobby(matchId);
  if (!lobby?.player2) return existing;

  await purgeHostWaitingDuplicates(lobby.player1, matchId);
  if (lobby.player2) {
    await purgeHostWaitingDuplicates(lobby.player2, matchId);
  }

  if (lobby?.betLamports && lobby.onChainAddress) {
    try {
      await verifyMatchFunded(
        matchId,
        lobby.onChainAddress,
        lobby.betLamports,
        expectedLobbyRakeBps(lobby),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Match escrow verification failed";
      console.warn(`[escrow] startFundedMatch blocked for ${matchId.slice(0, 8)}…:`, message);
      io.to(matchId).emit(SOCKET_EVENTS.GAME_ERROR, { message });
      return undefined;
    }
  }

  matchManager.markFunded(matchId);
  const state = matchManager.startGame(matchId);
  notifyMatchPlayers(io, matchId, state);
  io.emit(SOCKET_EVENTS.LOBBY_UPDATE, matchManager.listLobbies());
  botManager.onGameStarted(matchId);
  return state;
}

function emitGameOver(io: Server, matchId: string, ended: Awaited<ReturnType<typeof matchManager.endGame>>) {
  io.to(matchId).emit(SOCKET_EVENTS.GAME_OVER, ended);
  for (const change of ended.ratingChanges ?? []) {
    emitPlayerProfileUpdate(io, change.wallet);
  }
  tournamentManager.handleGameEnd(io, matchId, ended.winner);

  const lobby = matchManager.getLobby(matchId);
  if (lobby?.player2) {
    void (async () => {
      await purgeHostWaitingDuplicates(lobby.player1, matchId);
      await purgeHostWaitingDuplicates(lobby.player2!, matchId);
      io.emit(SOCKET_EVENTS.LOBBY_UPDATE, matchManager.listLobbies());
    })();
  }
  botManager.onGameFinished();
}

function tryMatchmakePair(io: Server): void {
  const pairing = matchmakingQueue.tryPair();
  if (!pairing) return;

  const payloads = matchmakingQueue.buildFoundPayload(pairing);
  const creatorEntry =
    pairing.a.queuedAt <= pairing.b.queuedAt ? pairing.a : pairing.b;
  const joinerEntry =
    pairing.a.queuedAt <= pairing.b.queuedAt ? pairing.b : pairing.a;

  io.sockets.sockets
    .get(creatorEntry.socketId)
    ?.emit(SOCKET_EVENTS.MATCHMAKE_FOUND, payloads.creator);
  io.sockets.sockets
    .get(joinerEntry.socketId)
    ?.emit(SOCKET_EVENTS.MATCHMAKE_FOUND, payloads.joiner);
}

export function registerSocketHandlers(io: Server): void {
  botManager.bind(io);

  matchManager.setGameEndNotifier((matchId, ended) => {
    emitGameOver(io, matchId, ended);
  });

  io.on("connection", (socket) => {
    registerSocketPresence(socket.id, {
      authenticatedWallet: socket.data.authenticatedWallet as string | undefined,
      guestId: socket.data.guestId as string | undefined,
    });

    void (async () => {
      const removed = await matchManager.purgeStaleWaitingLobbies();
      botManager.ensureGhostLobbies();
      const list = matchManager.listLobbies();
      socket.emit(SOCKET_EVENTS.LOBBY_LIST, list);
      if (removed > 0) {
        io.emit(SOCKET_EVENTS.LOBBY_UPDATE, list);
      }
    })();
    botManager.onPresenceChanged();
    socket.emit(SOCKET_EVENTS.TOURNAMENT_LIST, tournamentManager.listActive());
    socket.emit(
      SOCKET_EVENTS.TOURNAMENT_QUEUES_LIST,
      tournamentManager.listAllQueueStatuses(),
    );

    socket.on(SOCKET_EVENTS.LOBBY_SYNC, async () => {
      if (await socketTooFast(socket, SOCKET_EVENTS.LOBBY_SYNC, 30)) return;
      void (async () => {
        const removed = await matchManager.purgeStaleWaitingLobbies();
        botManager.ensureGhostLobbies();
        const list = matchManager.listLobbies();
        socket.emit(SOCKET_EVENTS.LOBBY_LIST, list);
        if (removed > 0) {
          io.emit(SOCKET_EVENTS.LOBBY_UPDATE, list);
        }
      })();
    });

    socket.on(
      SOCKET_EVENTS.PLAYER_PROFILE,
      (payload: { wallet?: string } | undefined) => {
        const wallet = payload?.wallet ?? socketIdentity(socket);
        if (!wallet) return;
        if (rejectUnauthorizedWallet(socket, wallet, undefined, { silent: true })) {
          return;
        }
        emitPlayerProfile(socket, wallet);
      },
    );

    socket.on(
      SOCKET_EVENTS.LOBBY_CREATE,
      (payload: {
        matchId?: string;
        wallet: string;
        betLamports: number;
        tokenMint?: string;
        onChainAddress?: string;
        ranked?: boolean;
        tournamentId?: string;
        bracketMatchId?: string;
        gameMode?: string;
        openTable?: boolean;
      }) => {
        void (async () => {
        if (await socketTooFast(socket, SOCKET_EVENTS.LOBBY_CREATE, 10)) return;
        try {
          if (!payload?.wallet) throw new Error("Wallet required");
          if (rejectUnauthorizedWallet(socket, payload.wallet)) return;
          if (payload.tokenMint && !isMintAllowed(payload.tokenMint)) {
            throw new Error("Token mint not allowed");
          }
          assertGuestLobbyAccess(payload.wallet, {
            gameMode: payload.gameMode as GameModeId | undefined,
            betLamports: payload.betLamports,
            ranked: payload.ranked,
            tournamentId: payload.tournamentId,
          });
          if (!getRuntimeConfig().mockEscrow && payload.betLamports > 0) {
            if (!payload.matchId || !payload.onChainAddress) {
              throw new Error("On-chain match address required for funded lobby");
            }
            const expectedPda = deriveExpectedMatchPda(payload.matchId);
            if (payload.onChainAddress !== expectedPda) {
              throw new Error("onChainAddress does not match expected match PDA");
            }
          }
          matchmakingQueue.cancel(payload.wallet);
          tournamentManager.unregister(payload.wallet);
          trackWallet(socket, payload.wallet);
          const profile = await getOrCreatePlayer(payload.wallet);

          const canAutoPair =
            !payload.openTable &&
            !payload.tournamentId &&
            !payload.bracketMatchId &&
            payload.betLamports === 0;

          if (canAutoPair) {
            const existing = matchManager.findJoinableLobby({
              wallet: payload.wallet,
              betLamports: payload.betLamports,
              gameMode: payload.gameMode as GameModeId | undefined,
              ranked: payload.ranked ?? false,
              playerRating: profile.rating,
            });
            if (existing) {
              const lobby = await matchManager.joinLobby(
                existing.id,
                payload.wallet,
              );
              io.emit(SOCKET_EVENTS.LOBBY_UPDATE, matchManager.listLobbies());
              socket.emit(SOCKET_EVENTS.LOBBY_JOIN, lobby);
              emitPlayerProfile(socket, payload.wallet);
              void startFundedMatch(io, existing.id).catch((err) => {
                socket.emit(SOCKET_EVENTS.GAME_ERROR, {
                  message:
                    err instanceof Error ? err.message : "Failed to start game",
                });
              });
              return;
            }
          }

          if (!payload.tournamentId && !payload.bracketMatchId) {
            const hostOpen = matchManager.listHostWaitingLobbies(payload.wallet);
            const keepId = payload.matchId;
            const stale = keepId
              ? hostOpen.filter((l) => l.id !== keepId)
              : hostOpen;
            if (stale.length > 0) {
              await closePaidWaitingLobbiesOnChain(stale);
              matchManager.cancelAllHostWaitingLobbies(payload.wallet, keepId);
              io.emit(
                SOCKET_EVENTS.LOBBY_UPDATE,
                matchManager.listLobbies(),
              );
            }
          }

          const lobby = matchManager.createLobby({
            id: payload.matchId,
            player1: payload.wallet,
            betLamports: payload.betLamports,
            tokenMint: payload.tokenMint,
            onChainAddress: payload.onChainAddress,
            ranked: payload.ranked,
            tournamentId: payload.tournamentId,
            bracketMatchId: payload.bracketMatchId,
            gameMode: payload.gameMode as GameModeId | undefined,
            player1Rating: profile.rating,
          });
          if (payload.tournamentId && payload.bracketMatchId && payload.matchId) {
            tournamentManager.linkGameMatch(
              payload.matchId,
              payload.tournamentId,
              payload.bracketMatchId,
            );
          }
          io.emit(SOCKET_EVENTS.LOBBY_UPDATE, matchManager.listLobbies());
          socket.emit(SOCKET_EVENTS.LOBBY_CREATE, lobby);
          emitPlayerProfile(socket, payload.wallet);
        } catch (err) {
          socket.emit(SOCKET_EVENTS.GAME_ERROR, {
            message: err instanceof Error ? err.message : "Failed to create lobby",
          });
        }
        })();
      },
    );

    socket.on(
      SOCKET_EVENTS.LOBBY_JOIN,
      (payload: {
        matchId: string;
        wallet: string;
        onChainAddress?: string;
        gameMode?: string;
      }) => {
        void (async () => {
        if (await socketTooFast(socket, SOCKET_EVENTS.LOBBY_JOIN, 20)) return;
        try {
          if (!payload?.wallet) throw new Error("Wallet required");
          if (rejectUnauthorizedWallet(socket, payload.wallet)) return;
          const targetLobby = matchManager.getLobby(payload.matchId);
          if (!targetLobby) throw new Error("Lobby not found");
          if (targetLobby.betLamports > 0 && !payload.gameMode) {
            throw new Error("gameMode required");
          }
          if (isGuestWallet(payload.wallet)) {
            assertGuestLobbyAccess(payload.wallet, {
              gameMode: targetLobby.gameMode as GameModeId | undefined,
              betLamports: targetLobby.betLamports,
              ranked: targetLobby.ranked,
              tournamentId: targetLobby.tournamentId,
            });
          }
          matchmakingQueue.cancel(payload.wallet);
          trackWallet(socket, payload.wallet);
          const lobby = await matchManager.joinLobby(
            payload.matchId,
            payload.wallet,
            payload.onChainAddress,
            payload.gameMode as GameModeId | undefined,
          );
          io.emit(SOCKET_EVENTS.LOBBY_UPDATE, matchManager.listLobbies());
          socket.emit(SOCKET_EVENTS.LOBBY_JOIN, lobby);
          emitPlayerProfile(socket, payload.wallet);

          void startFundedMatch(io, payload.matchId).catch((err) => {
            socket.emit(SOCKET_EVENTS.GAME_ERROR, {
              message:
                err instanceof Error ? err.message : "Failed to start game",
            });
          });
        } catch (err) {
          socket.emit(SOCKET_EVENTS.GAME_ERROR, {
            message: err instanceof Error ? err.message : "Failed to join lobby",
          });
        }
        })();
      },
    );

    socket.on(
      SOCKET_EVENTS.LOBBY_CANCEL,
      (payload: { matchId: string; wallet: string }) => {
        void (async () => {
          try {
            if (!payload?.matchId || !payload?.wallet) {
              throw new Error("Invalid cancel request");
            }
            if (rejectUnauthorizedWallet(socket, payload.wallet)) return;

            const hostWaiting = matchManager.listHostWaitingLobbies(
              payload.wallet,
            );

            await closePaidWaitingLobbiesOnChain(hostWaiting);

            const cancelled =
              hostWaiting.length > 0
                ? matchManager.cancelAllHostWaitingLobbies(payload.wallet)
                : [];

            io.emit(SOCKET_EVENTS.LOBBY_UPDATE, matchManager.listLobbies());
            socket.emit(SOCKET_EVENTS.LOBBY_CANCELLED, {
              matchIds: cancelled.map((l) => l.id),
            });
          } catch (err) {
            socket.emit(SOCKET_EVENTS.GAME_ERROR, {
              message:
                err instanceof Error ? err.message : "Failed to cancel lobby",
            });
          }
        })();
      },
    );

    socket.on(
      SOCKET_EVENTS.LOBBY_LEAVE,
      (payload: { matchId: string; wallet: string }) => {
        void (async () => {
          try {
            if (!payload?.matchId || !payload?.wallet) {
              throw new Error("Invalid leave request");
            }
            if (rejectUnauthorizedWallet(socket, payload.wallet)) return;

            const lobby = matchManager.getLobby(payload.matchId);
            if (
              lobby?.player1 === payload.wallet &&
              lobby.status === "waiting" &&
              !lobby.player2
            ) {
              await closePaidWaitingLobbiesOnChain([lobby]);
            }

            matchManager.leaveWaitingLobby(payload.matchId, payload.wallet);

            io.emit(SOCKET_EVENTS.LOBBY_UPDATE, matchManager.listLobbies());
            socket.emit(SOCKET_EVENTS.LOBBY_CANCELLED, {
              matchIds: [payload.matchId],
            });
          } catch (err) {
            socket.emit(SOCKET_EVENTS.GAME_ERROR, {
              message:
                err instanceof Error ? err.message : "Failed to leave lobby",
            });
          }
        })();
      },
    );

    socket.on(
      SOCKET_EVENTS.MATCHMAKE_QUEUE,
      (payload: { wallet: string; betLamports: number; ranked?: boolean }) => {
        void (async () => {
        try {
          if (!payload?.wallet) throw new Error("Wallet required");
          if (rejectUnauthorizedWallet(socket, payload.wallet)) return;
          if (isGuestWallet(payload.wallet)) {
            throw new Error("Guests cannot use ranked matchmaking");
          }
          assertModeAvailable(
            resolveRankedModeFromBet(payload.betLamports),
            getModeAvailability(),
          );
          if (!payload.wallet || payload.betLamports < 5_000_000) {
            throw new Error("Invalid matchmaking request");
          }
          tournamentManager.unregister(payload.wallet);
          const rating = await getPlayerRating(payload.wallet);
          const status = matchmakingQueue.enqueue(
            payload.wallet,
            payload.betLamports,
            socket.id,
            payload.ranked ?? true,
            rating,
          );
          socket.data.wallet = payload.wallet;
          socket.emit(SOCKET_EVENTS.MATCHMAKE_QUEUED, status);
          tryMatchmakePair(io);
        } catch (err) {
          socket.emit(SOCKET_EVENTS.GAME_ERROR, {
            message:
              err instanceof Error ? err.message : "Failed to join queue",
          });
        }
        })();
      },
    );

    socket.on(
      SOCKET_EVENTS.MATCHMAKE_CANCEL,
      (payload: { wallet: string }) => {
        if (!payload?.wallet) return;
        if (rejectUnauthorizedWallet(socket, payload.wallet)) return;
        matchmakingQueue.cancel(payload.wallet);
        socket.emit(SOCKET_EVENTS.MATCHMAKE_STATUS, { queued: false });
      },
    );

    socket.on(
      SOCKET_EVENTS.TOURNAMENT_REGISTER,
      (payload: {
        wallet: string;
        size: TournamentSize;
        entryLamports: number;
      }) => {
        try {
          if (!payload?.wallet) throw new Error("Wallet required");
          if (rejectUnauthorizedWallet(socket, payload.wallet)) return;
          if (isGuestWallet(payload.wallet)) {
            throw new Error("Guests cannot join tournaments");
          }
          assertModeAvailable(
            modeForTournamentSize(payload.size),
            getModeAvailability(),
          );
          const expectedEntry = tournamentEntryLamports(payload.size);
          if (
            !payload.wallet ||
            !payload.size ||
            payload.entryLamports !== expectedEntry
          ) {
            throw new Error("Invalid tournament registration");
          }
          matchmakingQueue.cancel(payload.wallet);
          const status = tournamentManager.register(
            payload.wallet,
            payload.size,
            payload.entryLamports,
            socket.id,
          );
          socket.data.wallet = payload.wallet;
          io.emit(SOCKET_EVENTS.TOURNAMENT_QUEUE_STATUS, status);
          io.emit(
            SOCKET_EVENTS.TOURNAMENT_QUEUES_LIST,
            tournamentManager.listAllQueueStatuses(),
          );
          socket.emit(SOCKET_EVENTS.TOURNAMENT_REGISTERED, status);
          tournamentManager.tryStart(io, payload.size, payload.entryLamports);
          io.emit(
            SOCKET_EVENTS.TOURNAMENT_QUEUES_LIST,
            tournamentManager.listAllQueueStatuses(),
          );
        } catch (err) {
          socket.emit(SOCKET_EVENTS.GAME_ERROR, {
            message:
              err instanceof Error ? err.message : "Failed to register",
          });
        }
      },
    );

    socket.on(
      SOCKET_EVENTS.TOURNAMENT_UNREGISTER,
      (payload: { wallet: string }) => {
        if (!payload?.wallet) return;
        if (rejectUnauthorizedWallet(socket, payload.wallet)) return;
        const status = tournamentManager.unregister(payload.wallet);
        if (status) {
          io.emit(SOCKET_EVENTS.TOURNAMENT_QUEUE_STATUS, status);
          io.emit(
            SOCKET_EVENTS.TOURNAMENT_QUEUES_LIST,
            tournamentManager.listAllQueueStatuses(),
          );
        }
      },
    );

    socket.on(
      SOCKET_EVENTS.MATCH_FUNDED,
      (payload: { matchId: string; wallet?: string }) => {
        const wallet = payload?.wallet ?? socketIdentity(socket);
        if (!wallet || !payload?.matchId) {
          socket.emit(SOCKET_EVENTS.GAME_ERROR, {
            message: "Unauthorized",
          });
          return;
        }
        if (rejectUnauthorizedWallet(socket, wallet)) return;
        const lobby = matchManager.getLobby(payload.matchId);
        if (
          !lobby ||
          (lobby.player1 !== wallet && lobby.player2 !== wallet)
        ) {
          socket.emit(SOCKET_EVENTS.GAME_ERROR, {
            message: "Not a player in this match",
          });
          return;
        }
        void startFundedMatch(io, payload.matchId).catch((err) => {
          socket.emit(SOCKET_EVENTS.GAME_ERROR, {
            message: err instanceof Error ? err.message : "Failed to start game",
          });
        });
      },
    );

    socket.on(
      SOCKET_EVENTS.GAME_LEAVE,
      (payload: { matchId: string; wallet: string }) => {
        if (!payload?.matchId || !payload?.wallet) return;
        if (rejectUnauthorizedWallet(socket, payload.wallet)) return;
        trackWallet(socket, payload.wallet);
        const states = matchManager.handlePlayerLeave(
          payload.wallet,
          payload.matchId,
        );
        for (const state of states) {
          notifyMatchPlayers(io, state.matchId, state);
        }
      },
    );

    socket.on(
      SOCKET_EVENTS.GAME_JOIN,
      (payload: { matchId: string; wallet: string }) => {
        if (!payload?.wallet) return;
        if (rejectUnauthorizedWallet(socket, payload.wallet)) return;
        trackWallet(socket, payload.wallet);
        const reconnected = matchManager.handlePlayerReconnect(
          payload.wallet,
          payload.matchId,
        );
        for (const state of reconnected) {
          notifyMatchPlayers(io, state.matchId, state);
        }

        const state = matchManager.getGame(payload.matchId);
        if (!state) {
          socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: "Game not found" });
          return;
        }
        if (
          payload.wallet !== state.playerWhite &&
          payload.wallet !== state.playerBlack
        ) {
          socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: "Not a player" });
          return;
        }
        void socket.join(payload.matchId);
        socket.emit(SOCKET_EVENTS.GAME_STATE, state);
      },
    );

    socket.on(
      SOCKET_EVENTS.GAME_MOVE,
      async (payload: {
        matchId: string;
        wallet: string;
        from: string;
        to: string;
        promotion?: "q" | "r" | "b" | "n";
      }) => {
        if (await socketTooFast(socket, SOCKET_EVENTS.GAME_MOVE, 180)) return;
        if (!payload?.wallet) return;
        if (rejectUnauthorizedWallet(socket, payload.wallet)) return;
        try {
          const result = await matchManager.makeMove(payload.matchId, payload.wallet, {
            from: payload.from,
            to: payload.to,
            promotion: payload.promotion,
          });
          io.to(payload.matchId).emit(SOCKET_EVENTS.GAME_STATE, result.state);
          if (result.ended) {
            emitGameOver(io, payload.matchId, result.ended);
          } else {
            botManager.onGameUpdated(payload.matchId);
          }
        } catch (err) {
          socket.emit(SOCKET_EVENTS.GAME_ERROR, {
            message: err instanceof Error ? err.message : "Invalid move",
          });
        }
      },
    );

    socket.on(
      SOCKET_EVENTS.GAME_RESIGN,
      async (payload: { matchId: string; wallet: string }) => {
        if (!payload?.wallet) return;
        if (rejectUnauthorizedWallet(socket, payload.wallet)) return;
        try {
          const ended = await matchManager.resign(payload.matchId, payload.wallet);
          io.to(payload.matchId).emit(SOCKET_EVENTS.GAME_STATE, ended.state);
          emitGameOver(io, payload.matchId, ended);
        } catch (err) {
          socket.emit(SOCKET_EVENTS.GAME_ERROR, {
            message: err instanceof Error ? err.message : "Resign failed",
          });
        }
      },
    );

    socket.on("disconnect", () => {
      removeSocketPresence(socket.id);
      botManager.onPresenceChanged();
      const wallet = socket.data.wallet as string | undefined;
      if (wallet) {
        const states = matchManager.handlePlayerLeave(wallet);
        for (const state of states) {
          notifyMatchPlayers(io, state.matchId, state);
        }
      }
      matchmakingQueue.removeBySocket(socket.id);
      tournamentManager.removeBySocket(socket.id);
    });
  });

  setInterval(() => {
    for (const matchId of matchManager.activeMatchIds()) {
      const state = matchManager.getGame(matchId);
      if (state?.status === "playing") {
        notifyMatchPlayers(io, matchId, state);
      }
    }

    const abandonedLobbies = matchManager.processGraceTimeouts();
    if (abandonedLobbies.length > 0) {
      void (async () => {
        for (const lobby of abandonedLobbies) {
          if (
            lobby.betLamports > 0 &&
            lobby.onChainAddress &&
            lobby.player1
          ) {
            try {
              await closeWaitingMatchOnChain({
                matchId: lobby.id,
                gamePubkey: lobby.onChainAddress,
                player1: lobby.player1,
                betLamports: lobby.betLamports,
                forceForfeit: true,
              });
            } catch (err) {
              console.error(
                "[escrow] abandon waiting room close failed:",
                err instanceof Error ? err.message : err,
              );
            }
          }
        }
      })();
      io.emit(SOCKET_EVENTS.LOBBY_UPDATE, matchManager.listLobbies());
    }
  }, 1000);

  setInterval(() => {
    tryMatchmakePair(io);
    for (const socket of io.sockets.sockets.values()) {
      const wallet = socket.data.wallet as string | undefined;
      if (wallet && matchmakingQueue.isQueued(wallet)) {
        socket.emit(
          SOCKET_EVENTS.MATCHMAKE_STATUS,
          matchmakingQueue.statusFor(wallet),
        );
      }
    }
  }, 3000);
}
