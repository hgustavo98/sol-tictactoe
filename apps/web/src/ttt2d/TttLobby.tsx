import { useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type {
  GameState,
  LobbyMatch,
  MatchmakeStatusPayload,
  PlayerProfile,
  TournamentFinishedPayload,
  TournamentQueueStatus,
  TournamentState,
} from "@sol-tictactoe/shared";
import type { Socket } from "socket.io-client";
import { formatSolAmount, validateBetSol, validateRankedBetSol } from "../config/bets";
import {
  betSolForMode,
  isCasualMode,
  isRankedMode,
  type GameModeId,
} from "../config/gameModes";
import { isSheetLayout } from "../hooks/useCompactLayout";
import { SolAmount } from "@/components/icons/SolanaIcon";
import { OpenTablesSheet } from "@/components/arena/OpenTablesSheet";
import { TttGame2D } from "./TttGame2D";
import { filterLobbiesByContext } from "../lib/openTablesFilter";
import { useModeAvailability } from "../hooks/useModeAvailability";
import { useJoinableOpenTables } from "../hooks/useJoinableOpenTables";
import { WaitingRoom } from "@/components/WaitingRoom";
import { TournamentWaitingRoom } from "@/components/tournament/TournamentWaitingRoom";
import { GameModalErrorBoundary } from "@/components/GameModalErrorBoundary";
import { TrainingGame2D } from "./training/TrainingGame2D";
import { useLobbyCarousel } from "../damas3d/lobby/useLobbyCarousel";
import type { LobbyView } from "./lobby/lobbyView";
import { MODE_ACCENT } from "./theme";
import type { ArenaCardData } from "../damas3d/lobby/ArenaCard3D";
import { cn } from "@/lib/utils";
import { useWalletModal } from "@/components/wallet/WalletModalContext";
import { XttBrandHero } from "./XttBrandHero";

export interface TttLobbyProps {
  playerId?: string;
  viewerWallet?: string;
  isGuest?: boolean;
  walletConnected?: boolean;
  guestModeActive?: boolean;
  guestStarting?: boolean;
  onPlayAsGuest?: () => void;
  lobbies: LobbyMatch[];
  betSol: number;
  loading: boolean;
  matchmakeQueued?: boolean;
  matchmakeStatus?: MatchmakeStatusPayload | null;
  lobbyView: LobbyView;
  activeMatchId?: string | null;
  waitingBet?: number;
  waitingGameMode?: GameModeId;
  waitingOnChain?: string;
  gameState?: GameState | null;
  socket?: Socket | null;
  myProfile?: PlayerProfile | null;
  opponentProfile?: PlayerProfile | null;
  onSelectBet: (bet: number) => void;
  onModeChange: (mode: GameModeId) => void;
  onPlay: (mode: GameModeId) => void;
  onRankedMatchmake?: () => void;
  onRankedOpenTable?: () => void;
  onRankedCancel?: () => void;
  tournamentQueue?: TournamentQueueStatus | null;
  allTournamentQueues?: TournamentQueueStatus[];
  tournamentRegistered?: boolean;
  onTournamentRegister?: () => void;
  onTournamentUnregister?: () => void;
  onExitLobbyView: () => void;
  onCancelWaiting?: () => void;
  onResign?: () => void;
  onTrainingStart?: () => void;
  activeTournament?: TournamentState | null;
  tournamentPostGame?: "won" | "lost" | null;
  tournamentFinished?: TournamentFinishedPayload | null;
  tournamentProfiles?: Record<string, PlayerProfile>;
  onExitTournament?: () => void;
  hostProfiles?: Record<string, PlayerProfile>;
  onJoinLobby?: (lobby: LobbyMatch) => void;
}

export function TttLobby(props: TttLobbyProps) {
  const { t } = useTranslation();
  const { openWalletModal } = useWalletModal();
  const {
    playerId,
    viewerWallet,
    isGuest = false,
    walletConnected = false,
    guestModeActive = false,
    guestStarting = false,
    onPlayAsGuest,
    lobbies,
    betSol,
    loading,
    matchmakeQueued = false,
    lobbyView,
    activeMatchId,
    waitingBet = 0,
    waitingGameMode = "casual1v1",
    waitingOnChain = "",
    gameState,
    socket,
    myProfile,
    opponentProfile,
    onSelectBet,
    onModeChange,
    onPlay,
    onRankedMatchmake,
    onRankedOpenTable,
    onRankedCancel,
    tournamentQueue,
    tournamentRegistered = false,
    onTournamentRegister,
    onTournamentUnregister,
    onExitLobbyView,
    onCancelWaiting,
    onResign,
    onTrainingStart,
    activeTournament,
    tournamentPostGame,
    tournamentFinished,
    tournamentProfiles,
    onExitTournament,
    hostProfiles = {},
    onJoinLobby,
  } = props;

  const { isPlayable, statusFor } = useModeAvailability();
  const [openTablesOpen, setOpenTablesOpen] = useState(() => !isSheetLayout());

  const carousel = useLobbyCarousel({
    lobbies,
    betSol,
    onSelectBet,
    onModeChange,
    tournamentQueue,
    isGuest,
    myProfile: myProfile
      ? { rating: myProfile.rating, gamesPlayed: myProfile.gamesPlayed }
      : null,
  });

  const browsing = lobbyView === "browse";
  const hasAccess = walletConnected || guestModeActive;
  const showConnect = browsing && !walletConnected && !guestModeActive;

  const isFreeCasual =
    isCasualMode(carousel.activeMode) &&
    betSolForMode(carousel.activeMode, betSol) === 0;

  const modeBlocked = !isPlayable(carousel.activeMode);
  const playDisabled =
    modeBlocked ||
    (isGuest && !isFreeCasual) ||
    (guestModeActive && !walletConnected && !playerId) ||
    (carousel.isCustomSlide && !!validateBetSol(betSol)) ||
    (carousel.isRankedStakeSlide && !!validateRankedBetSol(betSol)) ||
    matchmakeQueued ||
    carousel.isTournamentSlide ||
    loading;

  const activeEntrySol = isRankedMode(carousel.activeMode)
    ? betSol
    : betSolForMode(carousel.activeMode, betSol);

  const activeCard = carousel.cardDataList[carousel.index];
  const activeLobby = activeMatchId
    ? lobbies.find((l) => l.id === activeMatchId)
    : undefined;

  const joinableLobbies = useJoinableOpenTables(lobbies, browsing && hasAccess);
  const contextOpenTables = useMemo(
    () => filterLobbiesByContext(joinableLobbies, carousel.activeMode, betSol),
    [joinableLobbies, carousel.activeMode, betSol],
  );

  return (
    <div className="xtt-lobby" data-view={lobbyView}>
      {showConnect && (
        <div className="xtt-hero-stack">
          <XttBrandHero />
          <div className="xtt-connect">
            <button
              type="button"
              className="xtt-btn xtt-btn-primary xtt-btn-lg"
              onClick={() => openWalletModal()}
            >
              {t("wallet.connect")}
            </button>
            {onTrainingStart && (
              <button
                type="button"
                className="xtt-btn xtt-btn-ghost"
                onClick={onTrainingStart}
              >
                {t("training.start")}
              </button>
            )}
            <button
              type="button"
              className="xtt-btn xtt-btn-guest xtt-btn-lg"
              disabled={guestStarting}
              onClick={onPlayAsGuest}
            >
              {guestStarting ? "…" : t("lobby.playAsGuest")}
            </button>
          </div>
        </div>
      )}

      {browsing && hasAccess && (
        <XttBrandHero compact />
      )}

      {browsing && hasAccess && activeCard && (
        <div className="xtt-card">
          <div className="xtt-mode-row">
            {carousel.cardDataList.map((card: ArenaCardData, i: number) => (
              <button
                key={card.id}
                type="button"
                className={cn(
                  "xtt-mode-pill",
                  i === carousel.index && "xtt-mode-pill-active",
                )}
                style={
                  i === carousel.index
                    ? ({ "--pill-accent": MODE_ACCENT[card.id] } as CSSProperties)
                    : undefined
                }
                onClick={() => carousel.selectIndex(i)}
                disabled={card.locked}
              >
                {card.title}
              </button>
            ))}
          </div>

          <h2 className="xtt-card-title">{activeCard.title}</h2>
          <p className="xtt-card-desc">{activeCard.subtitle}</p>

          {carousel.isCustomSlide && (
            <div className="xtt-stake-row">
              <span>SOL</span>
              <input
                type="range"
                min={0.1}
                max={10}
                step={0.1}
                value={betSol}
                onChange={(e) => onSelectBet(parseFloat(e.target.value))}
              />
              <span className="xtt-stake-val">{formatSolAmount(betSol)}</span>
            </div>
          )}

          {!carousel.isTournamentSlide && !carousel.isRankedSlide && (
            <button
              type="button"
              className="xtt-btn xtt-btn-primary"
              style={{ width: "100%" }}
              disabled={playDisabled}
              onClick={() => onPlay(carousel.activeMode)}
            >
              {isFreeCasual ? (
                t("play.free")
              ) : (
                <SolAmount amount={formatSolAmount(activeEntrySol)} iconClassName="size-3.5" suffix />
              )}
            </button>
          )}

          {carousel.isRankedSlide && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <button
                type="button"
                className="xtt-btn xtt-btn-ghost"
                disabled={playDisabled || matchmakeQueued}
                onClick={() => onRankedMatchmake?.()}
              >
                {matchmakeQueued ? t("ranked.searching") : t("ranked.findMatch")}
              </button>
              <button
                type="button"
                className="xtt-btn xtt-btn-primary"
                disabled={playDisabled}
                onClick={() => onRankedOpenTable?.() ?? onPlay(carousel.activeMode)}
              >
                {t("ranked.openTable")}
              </button>
              {matchmakeQueued && (
                <button type="button" className="xtt-link" onClick={() => onRankedCancel?.()}>
                  {t("ranked.cancel")}
                </button>
              )}
            </div>
          )}

          {carousel.isTournamentSlide && (
            <button
              type="button"
              className="xtt-btn xtt-btn-primary"
              style={{ width: "100%" }}
              disabled={isGuest || modeBlocked || loading}
              onClick={() =>
                tournamentRegistered
                  ? onTournamentUnregister?.()
                  : onTournamentRegister?.()
              }
            >
              {tournamentRegistered ? t("tournament.leave") : t("tournament.join")}
            </button>
          )}

          <div className="xtt-footer-links">
            <button type="button" className="xtt-link" onClick={() => setOpenTablesOpen(true)}>
              {t("openTables.title")} ({contextOpenTables.length})
            </button>
            {onTrainingStart && (
              <button type="button" className="xtt-link" onClick={onTrainingStart}>
                {t("training.startShort")}
              </button>
            )}
          </div>

          {isGuest && !isFreeCasual && statusFor(carousel.activeMode) === "open" && (
            <p className="xtt-card-desc" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
              {t("lobby.guestModesLocked")}
            </p>
          )}
        </div>
      )}

      {browsing && hasAccess && (
        <OpenTablesSheet
          open={openTablesOpen}
          onOpenChange={setOpenTablesOpen}
          lobbies={joinableLobbies}
          activeMode={carousel.activeMode}
          betSol={betSol}
          tableCount={contextOpenTables.length}
          playerId={viewerWallet ?? playerId}
          isGuest={isGuest}
          myRating={myProfile?.rating}
          myGamesPlayed={myProfile?.gamesPlayed}
          hostProfiles={hostProfiles}
          loading={loading}
          tournamentQueue={tournamentQueue}
          onJoin={(lobby) => onJoinLobby?.(lobby)}
        />
      )}

      {!browsing && (
        <div className="xtt-stage">
          <GameModalErrorBoundary key={lobbyView} onReset={onExitLobbyView}>
            {lobbyView === "training" && (
              <TrainingGame2D embedded onExit={onExitLobbyView} />
            )}
            {lobbyView === "game" && gameState && playerId && socket && (
              <TttGame2D
                embedded
                socket={socket}
                game={gameState}
                playerId={playerId}
                myProfile={myProfile}
                opponentProfile={opponentProfile}
                onResign={onResign}
              />
            )}
            {lobbyView === "game" && (!gameState || !playerId || !socket) && (
              <div className="xtt-empty">
                <p>{t("game.boardUnavailable")}</p>
                <button type="button" className="xtt-link" onClick={onExitLobbyView}>
                  {t("lobby.backToLobby")}
                </button>
              </div>
            )}
            {lobbyView === "waiting" && activeMatchId && (
              <WaitingRoom
                matchId={activeMatchId}
                lobby={activeLobby}
                gameMode={
                  (activeLobby?.gameMode as GameModeId | undefined) ??
                  waitingGameMode
                }
                onChainAddress={waitingOnChain || activeLobby?.onChainAddress}
                betLamports={waitingBet ?? activeLobby?.betLamports ?? 0}
                playerId={playerId}
                onCancel={onCancelWaiting ?? onExitLobbyView}
              />
            )}
            {lobbyView === "tournament-wait" && activeTournament && (
              <TournamentWaitingRoom
                tournament={activeTournament}
                wallet={playerId}
                profiles={tournamentProfiles}
                postGame={tournamentPostGame}
                finished={tournamentFinished}
                onExit={onExitTournament ?? onExitLobbyView}
              />
            )}
          </GameModalErrorBoundary>
        </div>
      )}
    </div>
  );
}
