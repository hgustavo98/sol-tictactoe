import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toastAppError } from "./lib/appToast";
import {
  DEFAULT_RATING,
  findPersonalWaitingLobby,
  isCasualMode,
  SOCKET_EVENTS,
  type GameOverResult,
  type LobbyMatch,
  type MatchmakeFoundPayload,
  type TournamentMatchReadyPayload,
  type GameState,
} from "@sol-tictactoe/shared";
import { betSolForMode, lobbyCountsForRating, modeCountsForRating } from "./config/gameModes";
import { filterLobbiesByContext } from "./lib/openTablesFilter";
import {
  modeForTournamentSize as gameModeFromTournamentSize,
  tournamentEntryLamports,
  type TournamentSize,
} from "@sol-tictactoe/shared";
import { ActiveMatchBanner } from "./components/ActiveMatchBanner";
import { DevnetWarningModal } from "./components/DevnetWarningModal";
import { GameResultModal } from "./components/game/GameResultModal";
import { HardwareAccelBanner } from "./components/HardwareAccelBanner";
import { LobbyCenter } from "./components/LobbyCenter";
import { MainLayout } from "./components/layout/MainLayout";
import { XttFloatingControls } from "./ttt2d/XttFloatingControls";
import type { LobbyView } from "./ttt2d/lobby/lobbyView";
import type { GameModeId } from "./config/gameModes";
import { useLobbyActions } from "./hooks/useLobbyActions";
import { useCluster } from "./hooks/useCluster";
import { useEscrowMode } from "./hooks/useEscrowMode";
import { ensureGuestSession, useGuestId } from "./hooks/useGuestId";
import { usePlayerAuth } from "./hooks/usePlayerAuth";
import { useMatchmaking } from "./hooks/useMatchmaking";
import { usePlayerProfile } from "./hooks/usePlayerProfile";
import { useLobbyHostProfiles } from "./hooks/useLobbyHostProfiles";
import { usePlayerProfilesBatch } from "./hooks/usePlayerProfilesBatch";
import { useTournament } from "./hooks/useTournament";
import {
  useGame,
  useGameOver,
  useLobbies,
  useSocket,
} from "./hooks/useSocket";
import { useSiteVisitPing } from "./hooks/useSiteVisitPing";

export function App() {
  const { t } = useTranslation();
  useSiteVisitPing();
  const { publicKey, connected } = useWallet();
  const socket = useSocket();
  const lobbies = useLobbies(socket);
  const wallet = publicKey?.toBase58() ?? null;
  const guestId = useGuestId();
  const [guestModeActive, setGuestModeActive] = useState(false);
  const [guestStarting, setGuestStarting] = useState(false);
  const guestStartInFlightRef = useRef(false);
  const { signingIn, ensureSignedIn, isAuthenticated, session } = usePlayerAuth(guestId);
  const signedInWallet =
    isAuthenticated && session?.wallet ? session.wallet : null;
  const walletConnected = Boolean(wallet && connected);

  const [lobbyView, setLobbyView] = useState<LobbyView>("browse");
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [waitingBet, setWaitingBet] = useState(0);
  const [waitingGameMode, setWaitingGameMode] = useState<GameModeId>("casual1v1");
  const [waitingOnChain, setWaitingOnChain] = useState("");
  const [gameMode, setGameMode] = useState<GameModeId>("casual1v1");
  const [pendingTournamentJoin, setPendingTournamentJoin] =
    useState<TournamentMatchReadyPayload | null>(null);
  const [tournamentPostGame, setTournamentPostGame] = useState<
    "won" | "lost" | null
  >(null);
  const [gameResultModal, setGameResultModal] = useState<{
    result: GameOverResult;
    isTournament: boolean;
  } | null>(null);
  const shownResultMatchId = useRef<string | null>(null);
  const suppressWaitingRestoreUntilRef = useRef(0);
  const dismissedLobbyIdsRef = useRef<Set<string>>(new Set());

  const { gameState } = useGame(activeMatchId);
  const gameOver = useGameOver(activeMatchId);

  useEffect(() => {
    const onGameError = (payload: { message: string }) => {
      if (/unauthorized/i.test(payload.message)) {
        toastAppError("sign_in_required", t);
        return;
      }
      toastAppError(payload.message, t);
    };
    socket.on(SOCKET_EVENTS.GAME_ERROR, onGameError);
    return () => {
      socket.off(SOCKET_EVENTS.GAME_ERROR, onGameError);
    };
  }, [socket, t]);

  useEffect(() => {
    if (signedInWallet) {
      setGuestModeActive(false);
    }
  }, [signedInWallet]);

  useEffect(() => {
    if (walletConnected) {
      setGuestModeActive(false);
    }
  }, [walletConnected]);

  const profileWallet =
    signedInWallet ?? (guestModeActive ? guestId : null);
  const playerProfile = usePlayerProfile(profileWallet);
  const isGuestPreview = guestModeActive && !signedInWallet;
  const waitingLobbies = lobbies.filter(
    (l) => l.status === "waiting" && !l.player2,
  );
  const visibleLobbies = isGuestPreview
    ? waitingLobbies.filter(
        (l) => !l.ranked && !l.tournamentId && l.betLamports === 0,
      )
    : waitingLobbies;
  const lobbyPoolForMatch = isGuestPreview ? visibleLobbies : waitingLobbies;
  const hostProfiles = useLobbyHostProfiles(waitingLobbies);

  const enterGameRef = useCallback(
    (matchId: string) => {
      setActiveMatchId(matchId);
      setLobbyView("game");
    },
    [],
  );

  const { handleCreate, handleJoin, betSol, setBetSol, loading, wallet: playerId, lobbyViewerId, isGuest, abortPendingCreate } =
    useLobbyActions(
    socket,
    (matchId, onChain, betLamports, mode) => {
      dismissedLobbyIdsRef.current.delete(matchId);
      setActiveMatchId(matchId);
      setWaitingBet(betLamports);
      setWaitingOnChain(onChain);
      if (mode) setWaitingGameMode(mode);
      setLobbyView("waiting");
    },
    (matchId, betLamports = 0, mode) => {
      setActiveMatchId(matchId);
      if (mode) setWaitingGameMode(mode);
      if (betLamports === 0) {
        enterGameRef(matchId);
      } else {
        setWaitingBet(betLamports);
        setLobbyView("waiting");
      }
    },
    guestModeActive,
    lobbyPoolForMatch,
    playerProfile?.rating,
    signedInWallet,
    wallet,
    guestId,
    ensureSignedIn,
  );

  const releaseHostWaitingTable = useCallback(() => {
    if (!activeMatchId || !playerId) return;
    const lobby = lobbies.find((l) => l.id === activeMatchId);
    if (
      lobby?.player1 !== playerId ||
      lobby.player2 ||
      lobby.status !== "waiting"
    ) {
      return;
    }
    dismissedLobbyIdsRef.current.add(activeMatchId);
    socket.emit(SOCKET_EVENTS.LOBBY_LEAVE, {
      matchId: activeMatchId,
      wallet: playerId,
    });
    socket.emit(SOCKET_EVENTS.LOBBY_SYNC);
  }, [activeMatchId, playerId, lobbies, socket]);

  const resetLobbyBrowseState = useCallback(() => {
    setLobbyView("browse");
    setActiveMatchId(null);
    setWaitingBet(0);
    setWaitingOnChain("");
    setTournamentPostGame(null);
    setGameResultModal(null);
    shownResultMatchId.current = null;
  }, []);

  const exitLobbyView = useCallback(() => {
    releaseHostWaitingTable();
    abortPendingCreate();
    resetLobbyBrowseState();
  }, [releaseHostWaitingTable, abortPendingCreate, resetLobbyBrowseState]);

  const enterGame = useCallback(
    (matchId: string) => {
      enterGameRef(matchId);
      if (playerId) {
        socket.emit(SOCKET_EVENTS.GAME_JOIN, { matchId, wallet: playerId });
      }
    },
    [playerId, socket, enterGameRef],
  );

  const restoreWaitingRoom = useCallback((lobby: LobbyMatch) => {
    if (dismissedLobbyIdsRef.current.has(lobby.id)) return;
    setActiveMatchId(lobby.id);
    setWaitingBet(lobby.betLamports);
    setWaitingOnChain(lobby.onChainAddress ?? "");
    if (lobby.gameMode) setWaitingGameMode(lobby.gameMode as GameModeId);
    setLobbyView("waiting");
  }, []);

  const rejoinActiveMatch = useCallback(() => {
    if (activeMatchId) enterGame(activeMatchId);
  }, [activeMatchId, enterGame]);

  useEffect(() => {
    if (!playerId) return;

    const onGameActive = (payload: { matchId: string; state: GameState }) => {
      if (payload.state.status !== "playing") return;
      setActiveMatchId(payload.matchId);
      enterGameRef(payload.matchId);
      socket.emit(SOCKET_EVENTS.GAME_JOIN, {
        matchId: payload.matchId,
        wallet: playerId,
      });
    };

    const onLobbyActive = (payload: { lobby: LobbyMatch }) => {
      if (Date.now() < suppressWaitingRestoreUntilRef.current) return;
      if (dismissedLobbyIdsRef.current.has(payload.lobby.id)) return;
      restoreWaitingRoom(payload.lobby);
    };

    const onLobbyCancelled = (payload: { matchIds?: string[] }) => {
      for (const id of payload.matchIds ?? []) {
        dismissedLobbyIdsRef.current.add(id);
      }
    };

    const syncActiveGame = () => {
      socket.emit(SOCKET_EVENTS.PLAYER_PROFILE, { wallet: playerId });
    };

    socket.on(SOCKET_EVENTS.GAME_ACTIVE, onGameActive);
    socket.on(SOCKET_EVENTS.LOBBY_ACTIVE, onLobbyActive);
    socket.on(SOCKET_EVENTS.LOBBY_CANCELLED, onLobbyCancelled);
    if (socket.connected) syncActiveGame();
    socket.on("connect", syncActiveGame);

    return () => {
      socket.off(SOCKET_EVENTS.GAME_ACTIVE, onGameActive);
      socket.off(SOCKET_EVENTS.LOBBY_ACTIVE, onLobbyActive);
      socket.off(SOCKET_EVENTS.LOBBY_CANCELLED, onLobbyCancelled);
      socket.off("connect", syncActiveGame);
    };
  }, [playerId, socket, enterGameRef, restoreWaitingRoom]);

  useEffect(() => {
    for (const id of dismissedLobbyIdsRef.current) {
      if (!lobbies.some((l) => l.id === id)) {
        dismissedLobbyIdsRef.current.delete(id);
      }
    }
  }, [lobbies]);

  useEffect(() => {
    if (!playerId || activeMatchId || lobbyView !== "browse") return;
    if (Date.now() < suppressWaitingRestoreUntilRef.current) return;
    const lobby = findPersonalWaitingLobby(lobbies, playerId);
    if (!lobby || dismissedLobbyIdsRef.current.has(lobby.id)) return;
    restoreWaitingRoom(lobby);
  }, [playerId, lobbies, activeMatchId, lobbyView, restoreWaitingRoom]);

  const cancelWaitingRoom = useCallback(() => {
    suppressWaitingRestoreUntilRef.current = Date.now() + 30_000;
    releaseHostWaitingTable();
    abortPendingCreate();
    resetLobbyBrowseState();
  }, [releaseHostWaitingTable, abortPendingCreate, resetLobbyBrowseState]);

  const onCreatorMatched = useCallback(
    (found: MatchmakeFoundPayload) => {
      void handleCreate({
        matchId: found.matchId,
        ranked: true,
        gameMode: "custom1v1",
      });
    },
    [handleCreate],
  );

  const onJoinerMatched = useCallback(
    (_found: MatchmakeFoundPayload, joinLobby: LobbyMatch) => {
      void handleJoin(joinLobby, { expectedGameMode: "custom1v1" });
    },
    [handleJoin],
  );

  const onTournamentMatchReady = useCallback(
    (ready: TournamentMatchReadyPayload) => {
      setTournamentPostGame(null);
      const size = ([4, 6, 8, 12] as TournamentSize[]).find(
        (s) => tournamentEntryLamports(s) === ready.entryLamports,
      );
      const tourneyMode = size ? gameModeFromTournamentSize(size) : gameMode;
      if (ready.role === "creator") {
        void handleCreate({
          matchId: ready.matchId,
          ranked: true,
          tournamentId: ready.tournamentId,
          bracketMatchId: ready.bracketMatchId,
          gameMode: tourneyMode,
        });
      } else {
        setPendingTournamentJoin(ready);
      }
    },
    [handleCreate, gameMode],
  );

  const matchmaking = useMatchmaking(
    socket,
    signedInWallet ?? wallet ?? undefined,
    lobbies,
    onCreatorMatched,
    onJoinerMatched,
  );

  const tournament = useTournament(
    socket,
    signedInWallet ?? wallet ?? undefined,
    gameMode,
    onTournamentMatchReady,
  );

  const handleTournamentRegister = useCallback(async () => {
    const actionWallet = await ensureSignedIn();
    if (!actionWallet) return;
    if (!tournament.register(actionWallet)) {
      toastAppError("wallet_required", t);
      return;
    }
    const openTables = filterLobbiesByContext(lobbies, gameMode, betSol);
    const joinable = openTables.find(
      (lobby) => lobby.player1 !== actionWallet && !lobby.player2,
    );
    if (joinable) {
      void handleJoin(joinable, { expectedGameMode: gameMode });
      return;
    }
    void handleCreate({ gameMode, ranked: true });
  }, [
    ensureSignedIn,
    tournament,
    t,
    lobbies,
    gameMode,
    betSol,
    handleJoin,
    handleCreate,
  ]);

  const handleRankedOpenTable = useCallback(() => {
    void handleCreate({ gameMode: "custom1v1" });
  }, [handleCreate]);

  const handleRankedMatchmake = useCallback(async () => {
    const actionWallet = await ensureSignedIn();
    if (!actionWallet) return;
    if (!matchmaking.queue(betSol, actionWallet)) {
      toastAppError("wallet_required", t);
    }
  }, [ensureSignedIn, matchmaking, betSol, t]);

  const { activeTournament, tournamentFinished, clearTournament } = tournament;

  useEffect(() => {
    if (!gameOver || !playerId) return;
    if (shownResultMatchId.current === gameOver.state.matchId) return;
    shownResultMatchId.current = gameOver.state.matchId;

    const tourney = activeTournament;
    const inTourney =
      tourney && tourney.status === "active" && tourney.players.includes(playerId);

    if (inTourney) {
      setTournamentPostGame(gameOver.winner === playerId ? "won" : "lost");
    }

    setGameResultModal({
      result: gameOver,
      isTournament: Boolean(inTourney),
    });
  }, [gameOver, activeTournament, playerId]);

  const handleGameResultContinue = useCallback(() => {
    const pending = gameResultModal;
    setGameResultModal(null);
    if (!pending) return;

    if (pending.isTournament) {
      setActiveMatchId(null);
      setLobbyView("tournament-wait");
      return;
    }

    suppressWaitingRestoreUntilRef.current = Date.now() + 15000;
    if (playerId) {
      socket.emit(SOCKET_EVENTS.LOBBY_CANCEL, {
        matchId: pending.result.state.matchId,
        wallet: playerId,
      });
    }
    exitLobbyView();
  }, [gameResultModal, exitLobbyView, playerId, socket]);

  const exitTournament = useCallback(() => {
    clearTournament();
    exitLobbyView();
  }, [clearTournament, exitLobbyView]);

  const tournamentWallets = activeTournament?.players ?? [];
  const tournamentProfiles = usePlayerProfilesBatch(tournamentWallets);

  const opponentWallet =
    gameState && playerId
      ? gameState.playerWhite === playerId
        ? gameState.playerBlack
        : gameState.playerBlack === playerId
          ? gameState.playerWhite
          : undefined
      : undefined;
  const opponentProfiles = usePlayerProfilesBatch([opponentWallet]);
  const opponentProfile = opponentWallet
    ? opponentProfiles[opponentWallet]
    : null;

  const myGameProfile = useMemo(() => {
    if (playerProfile) return playerProfile;
    if (!playerId) return null;
    return {
      wallet: playerId,
      rating: DEFAULT_RATING,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      updatedAt: 0,
      nickname: null,
      avatarUrl: null,
    };
  }, [playerProfile, playerId]);

  const inGame = lobbyView === "game";
  const inTournamentWait = lobbyView === "tournament-wait";
  const inTraining = lobbyView === "training";

  const activeLobby = activeMatchId
    ? lobbies.find((l) => l.id === activeMatchId)
    : undefined;

  const activeBetLamports =
    activeLobby?.betLamports ?? (lobbyView === "waiting" ? waitingBet : null);

  const isFreeEntryTable =
    activeBetLamports === 0 &&
    (lobbyView === "waiting" || lobbyView === "game");

  const inActiveTournament =
    Boolean(
      activeTournament?.status === "active" &&
        playerId &&
        activeTournament.players.includes(playerId),
    );
  const countsForRating = activeLobby
    ? lobbyCountsForRating(activeLobby)
    : inActiveTournament && inGame;
  const isTournamentMatch = activeLobby
    ? Boolean(activeLobby.tournamentId)
    : inActiveTournament && inGame;

  useEffect(() => {
    if (!pendingTournamentJoin) return;
    const lobby = lobbies.find((l) => l.id === pendingTournamentJoin.matchId);
    if (!lobby || lobby.status !== "waiting") return;
    setPendingTournamentJoin(null);
    setTournamentPostGame(null);
    void handleJoin(lobby, {
      expectedGameMode: lobby.gameMode as GameModeId | undefined,
    });
  }, [lobbies, pendingTournamentJoin, handleJoin]);

  useEffect(() => {
    if (!activeMatchId || lobbyView !== "waiting") return;

    const onState = (state: { matchId: string; status: string }) => {
      if (state.matchId === activeMatchId && state.status === "playing") {
        enterGame(activeMatchId);
      }
    };

    socket.on(SOCKET_EVENTS.GAME_STATE, onState);
    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE, onState);
    };
  }, [socket, activeMatchId, lobbyView, enterGame]);

  const handleResign = () => {
    if (!socket || !playerId || !activeMatchId) return;
    socket.emit(SOCKET_EVENTS.GAME_RESIGN, {
      matchId: activeMatchId,
      wallet: playerId,
    });
  };

  const {
    configError,
    configLoading,
    escrowEnabled,
    mockEscrow,
  } = useEscrowMode();
  const { isDevnet } = useCluster();
  const [devnetWarningOpen, setDevnetWarningOpen] = useState(false);

  useEffect(() => {
    if (!isDevnet || configLoading) return;
    const dismissed = sessionStorage.getItem("sol-ttt-devnet-warning-dismissed");
    if (dismissed !== "1") {
      setDevnetWarningOpen(true);
    }
  }, [isDevnet, configLoading]);

  return (
    <div className="app-shell xtt-app">
      <XttFloatingControls onDevnetBadgeClick={() => setDevnetWarningOpen(true)} />
      <DevnetWarningModal
        open={devnetWarningOpen}
        onOpenChange={setDevnetWarningOpen}
      />
      <HardwareAccelBanner />

      {configError && (
        <div className="xtt-toast xtt-toast-error" role="alert">
          <span>{t("errors.configFailed")}</span>
        </div>
      )}

      {!configLoading && !configError && !mockEscrow && !escrowEnabled && !isFreeEntryTable && !inTraining && (
        <div className="xtt-toast" role="status">
          <span>{t("errors.escrowNotReady")}</span>
        </div>
      )}

      {lobbyView === "browse" && gameState?.status === "playing" && (
        <ActiveMatchBanner
          gameState={gameState}
          playerId={playerId}
          onRejoin={rejoinActiveMatch}
        />
      )}

      <main className="app-main">
        <MainLayout lobbyView={lobbyView}>
          <div className="xtt-shell">
            <LobbyCenter
              lobbies={waitingLobbies}
              betSol={betSol}
              loading={loading || signingIn}
              playerId={playerId}
              viewerWallet={lobbyViewerId}
              isGuest={isGuest}
              walletConnected={walletConnected}
              guestModeActive={guestModeActive}
              guestStarting={guestStarting}
              onPlayAsGuest={() => {
                if (guestStartInFlightRef.current) return;
                guestStartInFlightRef.current = true;
                setGuestStarting(true);
                void ensureGuestSession().then((result) => {
                  guestStartInFlightRef.current = false;
                  setGuestStarting(false);
                  if (result.ok) {
                    setGuestModeActive(true);
                    return;
                  }
                  toastAppError("guest_session_failed", t);
                });
              }}
              lobbyView={lobbyView}
              activeMatchId={activeMatchId}
              waitingBet={waitingBet}
              waitingGameMode={waitingGameMode}
              waitingOnChain={waitingOnChain}
              gameState={gameState}
              socket={socket}
              myProfile={myGameProfile}
              opponentProfile={opponentProfile}
              matchmakeQueued={matchmaking.queued}
              matchmakeStatus={matchmaking.status}
              tournamentQueue={tournament.queueStatus}
              allTournamentQueues={tournament.allQueues}
              tournamentRegistered={tournament.registered}
              onSelectBet={setBetSol}
              onModeChange={setGameMode}
              onPlay={(mode) => {
                const isFreeCasual =
                  isCasualMode(mode) && betSolForMode(mode, betSol) === 0;
                void handleCreate({
                  gameMode: mode,
                  openTable: isFreeCasual,
                });
              }}
              onRankedMatchmake={handleRankedMatchmake}
              onRankedOpenTable={handleRankedOpenTable}
              onRankedCancel={matchmaking.cancel}
              onTournamentRegister={handleTournamentRegister}
              onTournamentUnregister={tournament.unregister}
              onExitLobbyView={exitLobbyView}
              onCancelWaiting={cancelWaitingRoom}
              onResign={handleResign}
              onTrainingStart={() => setLobbyView("training")}
              activeTournament={activeTournament}
              tournamentPostGame={tournamentPostGame}
              tournamentFinished={tournamentFinished}
              tournamentProfiles={tournamentProfiles}
              onExitTournament={exitTournament}
              hostProfiles={hostProfiles}
              onJoinLobby={(l) => void handleJoin(l, { expectedGameMode: gameMode })}
            />
          </div>
        </MainLayout>
      </main>

      {gameResultModal && playerId && (
        <GameResultModal
          open
          result={gameResultModal.result}
          playerId={playerId}
          isTournamentMatch={gameResultModal.isTournament}
          onContinue={handleGameResultContinue}
        />
      )}
      <div id="app-layer-overlays" className="app-layer-overlays" />
    </div>
  );
}
