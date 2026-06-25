import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  DEFAULT_RATING,
  findJoinableLobby,
  isCasualMode,
  lobbiesCompatibleForJoin,
  rakeBpsForMode,
  SOCKET_EVENTS,
  solToLamports,
  type LobbyMatch,
} from "@sol-tictactoe/shared";
import type { Socket } from "socket.io-client";
import { validateBetSol, validateRankedBetSol } from "../config/bets";
import {
  betSolForMode,
  CASUAL_BET_SOL,
  isCustomMode,
  isRankedMode,
  type GameModeId,
} from "../config/gameModes";
import { useEscrow } from "./useEscrow";
import { useEscrowMode } from "./useEscrowMode";
import { toastAppError } from "../lib/appToast";
import { MatchJoinValidationError } from "../lib/matchEscrow";
import { ensureGuestSession } from "./useGuestId";
import { waitForSocketConnected } from "./useSocket";

function asGameMode(mode?: string): GameModeId | undefined {
  return mode as GameModeId | undefined;
}

function listenForLobbyMatch(
  socket: Socket,
  event: string,
  matchId: string,
  handler: (lobby: LobbyMatch) => void,
) {
  const listener = (lobby: LobbyMatch) => {
    if (lobby.id !== matchId) return;
    socket.off(event, listener);
    handler(lobby);
  };
  socket.on(event, listener);
}

export function useLobbyActions(
  socket: Socket,
  onCreated: (matchId: string, onChain: string, betLamports: number, gameMode?: GameModeId) => void,
  onJoined: (matchId: string, betLamports?: number, gameMode?: GameModeId) => void,
  guestModeActive = false,
  lobbies: LobbyMatch[] = [],
  myRating?: number,
  signedInWallet: string | null = null,
  connectedWallet: string | null = null,
  guestId: string | null = null,
  ensureSignedIn?: () => Promise<string | null>,
) {
  const { t } = useTranslation();
  const { connected, publicKey, signTransaction, wallet: walletAdapter } = useWallet();
  const { createMatch, joinMatch, previewMatchPda } = useEscrow();
  const {
    escrowEnabled,
    mockEscrow,
    configReady,
    configLoading,
    requiresOnChainPayment,
    cluster,
    configError,
  } = useEscrowMode();
  const [betSol, setBetSol] = useState(CASUAL_BET_SOL);
  const [loading, setLoading] = useState(false);
  const createInFlightRef = useRef(false);
  const pendingCreateGenerationRef = useRef(0);
  const pendingOpenTableRef = useRef<{
    matchId: string;
    wallet: string;
  } | null>(null);

  const notifyError = useCallback(
    (message: string) => {
      toastAppError(message, t);
    },
    [t],
  );

  const resolveRankedBet = useCallback(
    (mode: GameModeId) => betSolForMode(mode, betSol),
    [betSol],
  );

  const playerId =
    signedInWallet ?? guestId ?? undefined;
  const lobbyViewerId = playerId ?? connectedWallet ?? undefined;
  const isGuest = Boolean(guestId && !signedInWallet);
  const effectiveRating = myRating ?? (isGuest ? DEFAULT_RATING : undefined);

  const resolveActionWallet = useCallback(
    async (isFreeCasual: boolean): Promise<string | undefined> => {
      if (isFreeCasual && guestId && !signedInWallet) {
        const session = await ensureGuestSession();
        if (!session.ok) {
          notifyError("guest_session_failed");
          return undefined;
        }
        return session.session.guestId;
      }

      if (connectedWallet) {
        if (signedInWallet) return signedInWallet;
        if (!ensureSignedIn) {
          notifyError("sign_in_required");
          return undefined;
        }
        const wallet = await ensureSignedIn();
        if (!wallet) {
          notifyError("sign_in_required");
          return undefined;
        }
        return wallet;
      }

      if (isFreeCasual && guestId) {
        return guestId;
      }

      notifyError(isFreeCasual ? "guest_session_failed" : "wallet_required");
      return undefined;
    },
    [
      guestId,
      connectedWallet,
      signedInWallet,
      ensureSignedIn,
      notifyError,
    ],
  );

  const canSignTransactions = useCallback((): boolean => {
    if (signTransaction) return true;
    const adapter = walletAdapter?.adapter;
    return Boolean(
      adapter &&
        "signTransaction" in adapter &&
        typeof adapter.signTransaction === "function",
    );
  }, [signTransaction, walletAdapter]);

  const requireConnectedWallet = useCallback(async (): Promise<string | null> => {
    if (signedInWallet) {
      const address = publicKey?.toBase58() ?? connectedWallet;
      if (!connected || !address || address !== signedInWallet) {
        notifyError("wallet_connect_for_tx");
        return null;
      }
      if (!canSignTransactions()) {
        notifyError("wallet_no_sign");
        return null;
      }
      return signedInWallet;
    }
    if (!connectedWallet || !ensureSignedIn) {
      notifyError("sign_in_required");
      return null;
    }
    const wallet = await ensureSignedIn();
    if (!wallet) {
      notifyError("sign_in_required");
      return null;
    }
    if (!canSignTransactions()) {
      notifyError("wallet_no_sign");
      return null;
    }
    return wallet;
  }, [
    signedInWallet,
    publicKey,
    connectedWallet,
    connected,
    canSignTransactions,
    ensureSignedIn,
    notifyError,
  ]);

  const ensurePaidEscrowReady = useCallback(
    async (betLamports: number): Promise<boolean> => {
      if (betLamports === 0) return true;
      if (configLoading || !configReady) {
        notifyError(configError ? "config_failed" : "config_loading");
        return false;
      }
      const wallet = await requireConnectedWallet();
      if (!wallet) return false;
      if (mockEscrow) return true;
      if (!requiresOnChainPayment) {
        notifyError("escrow_not_ready");
        return false;
      }
      if (!escrowEnabled) {
        notifyError("escrow_not_ready");
        return false;
      }
      return true;
    },
    [
      configLoading,
      configReady,
      configError,
      requireConnectedWallet,
      mockEscrow,
      requiresOnChainPayment,
      escrowEnabled,
      notifyError,
    ],
  );

  const emitFundedLobbyCreate = useCallback(
    (
      actionWallet: string,
      matchId: string,
      betLamports: number,
      ranked: boolean,
      gameMode: GameModeId,
      rakeBps: number,
      opts: {
        tournamentId?: string;
        bracketMatchId?: string;
      },
      onChainAddress?: string,
      generation?: number,
    ) => {
      listenForLobbyMatch(socket, SOCKET_EVENTS.LOBBY_CREATE, matchId, (lobby) => {
        if (
          generation != null &&
          generation !== pendingCreateGenerationRef.current
        ) {
          return;
        }
        onCreated(
          lobby.id,
          onChainAddress ?? "",
          lobby.betLamports,
          asGameMode(lobby.gameMode),
        );
      });
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE, {
        matchId,
        wallet: actionWallet,
        betLamports,
        onChainAddress,
        ranked,
        tournamentId: opts.tournamentId,
        bracketMatchId: opts.bracketMatchId,
        gameMode,
        rakeBps,
      });
    },
    [socket, onCreated],
  );

  const handleJoin = useCallback(async (
    lobby: LobbyMatch,
    opts?: { expectedGameMode?: GameModeId },
  ) => {
    if (!socket) return;

    const isFreeJoin = lobby.betLamports === 0;
    const actionWallet = await resolveActionWallet(isFreeJoin);
    if (!actionWallet) return;

    if (!(await waitForSocketConnected(socket))) {
      notifyError("guest_session_failed");
      return;
    }

    if (lobby.betLamports > 0 && isGuest) {
      notifyError("wallet_required");
      return;
    }

    if (
      opts?.expectedGameMode &&
      !lobbiesCompatibleForJoin(lobby, {
        gameMode: opts.expectedGameMode,
        betLamports: lobby.betLamports,
      })
    ) {
      notifyError("mode_mismatch");
      return;
    }

    setLoading(true);
    try {
      const joinPayload = {
        matchId: lobby.id,
        wallet: actionWallet,
        gameMode: opts?.expectedGameMode,
      };

      if (lobby.betLamports === 0) {
        listenForLobbyMatch(socket, SOCKET_EVENTS.LOBBY_JOIN, lobby.id, (joined) => {
          onJoined(joined.id, joined.betLamports, asGameMode(joined.gameMode));
          if (joined.betLamports === 0) {
            socket.emit(SOCKET_EVENTS.GAME_JOIN, {
              matchId: joined.id,
              wallet: actionWallet,
            });
          }
        });
        socket.emit(SOCKET_EVENTS.LOBBY_JOIN, joinPayload);
        return;
      }

      if (!(await ensurePaidEscrowReady(lobby.betLamports))) return;

      if (mockEscrow) {
        listenForLobbyMatch(socket, SOCKET_EVENTS.LOBBY_JOIN, lobby.id, (joined) => {
          onJoined(joined.id, joined.betLamports, asGameMode(joined.gameMode));
          socket.emit(SOCKET_EVENTS.MATCH_FUNDED, { matchId: joined.id });
        });
        socket.emit(SOCKET_EVENTS.LOBBY_JOIN, joinPayload);
        return;
      }

      const onChain = lobby.onChainAddress ?? previewMatchPda(lobby.id);
      const joinResult = await joinMatch(
        onChain,
        lobby.betLamports,
        lobby.tokenMint ?? undefined,
        lobby.id,
      );
      listenForLobbyMatch(socket, SOCKET_EVENTS.LOBBY_JOIN, lobby.id, (joined) => {
        onJoined(joined.id, joined.betLamports, asGameMode(joined.gameMode));
        socket.emit(SOCKET_EVENTS.MATCH_FUNDED, { matchId: joined.id });
      });
      socket.emit(SOCKET_EVENTS.LOBBY_JOIN, {
        ...joinPayload,
        onChainAddress: joinResult.matchPda,
      });
    } catch (e) {
      if (e instanceof MatchJoinValidationError) {
        socket.emit(SOCKET_EVENTS.LOBBY_SYNC);
      }
      notifyError(e instanceof Error ? e.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  }, [
    socket,
    resolveActionWallet,
    isGuest,
    ensurePaidEscrowReady,
    mockEscrow,
    joinMatch,
    onJoined,
    notifyError,
    previewMatchPda,
  ]);

  const handleCreate = useCallback(async (opts?: {
    matchId?: string;
    ranked?: boolean;
    tournamentId?: string;
    bracketMatchId?: string;
    gameMode?: GameModeId;
    openTable?: boolean;
  }) => {
    if (!socket) return;
    if (createInFlightRef.current || loading) return;

    const gameMode: GameModeId =
      opts?.gameMode ?? (betSol > 0 ? "custom1v1" : "casual1v1");
    const ranked = false;
    const expectedBet = betSolForMode(gameMode, betSol);
    const isFreeCasual = isCasualMode(gameMode) && expectedBet === 0;

    if (!isFreeCasual && isGuest) {
      notifyError("wallet_required");
      return;
    }

    if (isCustomMode(gameMode)) {
      const err = validateBetSol(betSol);
      if (err) {
        notifyError(err);
        return;
      }
    } else if (isRankedMode(gameMode)) {
      const rankedBet = resolveRankedBet(gameMode);
      const err = validateRankedBetSol(rankedBet);
      if (err) {
        notifyError(err === "min" ? "ranked_min" : err === "max" ? "ranked_max" : err);
        return;
      }
    } else if (
      !isFreeCasual &&
      Math.abs(betSol - expectedBet) > 1e-9
    ) {
      notifyError("invalid");
      return;
    }

    const targetLamports = isFreeCasual ? 0 : solToLamports(expectedBet);

    createInFlightRef.current = true;
    setLoading(true);
    const createGeneration = ++pendingCreateGenerationRef.current;
    try {
      const actionWallet = await resolveActionWallet(isFreeCasual);
      if (!actionWallet) return;

      if (!(await waitForSocketConnected(socket))) {
        notifyError("guest_session_failed");
        return;
      }

      if (
        !opts?.openTable &&
        !opts?.matchId &&
        !opts?.tournamentId &&
        !opts?.bracketMatchId
      ) {
        const joinable = findJoinableLobby({
          lobbies,
          wallet: actionWallet,
          betLamports: targetLamports,
          gameMode,
          ranked,
          playerRating: effectiveRating,
        });
        if (joinable) {
          await handleJoin(joinable, { expectedGameMode: gameMode });
          return;
        }
      }

      const matchId = opts?.matchId ?? crypto.randomUUID();

      if (isFreeCasual) {
        const onAutoPaired = (lobby: LobbyMatch) => {
          if (createGeneration !== pendingCreateGenerationRef.current) return;
          if (lobby.player2 !== actionWallet) return;
          pendingOpenTableRef.current = null;
          socket.off(SOCKET_EVENTS.LOBBY_JOIN, onAutoPaired);
          socket.off(SOCKET_EVENTS.LOBBY_CREATE, onCreatedLobby);
          onJoined(lobby.id);
          socket.emit(SOCKET_EVENTS.GAME_JOIN, {
            matchId: lobby.id,
            wallet: actionWallet,
          });
        };
        const onCreatedLobby = (lobby: LobbyMatch) => {
          if (createGeneration !== pendingCreateGenerationRef.current) return;
          if (lobby.id !== matchId || lobby.player1 !== actionWallet) return;
          pendingOpenTableRef.current = null;
          socket.off(SOCKET_EVENTS.LOBBY_JOIN, onAutoPaired);
          socket.off(SOCKET_EVENTS.LOBBY_CREATE, onCreatedLobby);
          onCreated(lobby.id, "", 0);
        };
        socket.on(SOCKET_EVENTS.LOBBY_JOIN, onAutoPaired);
        socket.on(SOCKET_EVENTS.LOBBY_CREATE, onCreatedLobby);
        if (opts?.openTable) {
          pendingOpenTableRef.current = { matchId, wallet: actionWallet };
        }
        socket.emit(SOCKET_EVENTS.LOBBY_CREATE, {
          matchId,
          wallet: actionWallet,
          betLamports: 0,
          ranked,
          tournamentId: opts?.tournamentId,
          bracketMatchId: opts?.bracketMatchId,
          gameMode,
          rakeBps: 0,
          openTable: opts?.openTable ?? false,
        });
        return;
      }

      if (!(await ensurePaidEscrowReady(targetLamports))) return;

      const rakeBps = rakeBpsForMode(gameMode);

      if (mockEscrow) {
        emitFundedLobbyCreate(
          actionWallet,
          matchId,
          targetLamports,
          ranked,
          gameMode,
          rakeBps,
          {
            tournamentId: opts?.tournamentId,
            bracketMatchId: opts?.bracketMatchId,
          },
          undefined,
          createGeneration,
        );
        return;
      }

      const result = await createMatch(
        expectedBet,
        undefined,
        matchId,
        rakeBps,
      );
      emitFundedLobbyCreate(
        actionWallet,
        matchId,
        result.betLamports,
        ranked,
        gameMode,
        rakeBps,
        {
          tournamentId: opts?.tournamentId,
          bracketMatchId: opts?.bracketMatchId,
        },
        result.matchPda,
        createGeneration,
      );
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to create match");
    } finally {
      createInFlightRef.current = false;
      setLoading(false);
    }
  }, [
    socket,
    resolveActionWallet,
    isGuest,
    betSol,
    resolveRankedBet,
    lobbies,
    effectiveRating,
    ensurePaidEscrowReady,
    mockEscrow,
    createMatch,
    emitFundedLobbyCreate,
    onCreated,
    onJoined,
    handleJoin,
    notifyError,
    loading,
  ]);

  const abortPendingCreate = useCallback(() => {
    pendingCreateGenerationRef.current += 1;
    const pending = pendingOpenTableRef.current;
    pendingOpenTableRef.current = null;
    if (pending) {
      socket.emit(SOCKET_EVENTS.LOBBY_LEAVE, {
        matchId: pending.matchId,
        wallet: pending.wallet,
      });
      socket.emit(SOCKET_EVENTS.LOBBY_SYNC);
    }
    createInFlightRef.current = false;
    setLoading(false);
  }, [socket]);

  return {
    betSol,
    setBetSol,
    loading,
    wallet: playerId,
    lobbyViewerId,
    isGuest,
    handleCreate,
    handleJoin,
    abortPendingCreate,
  };
}
