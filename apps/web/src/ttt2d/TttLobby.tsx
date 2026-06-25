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
import { LobbyConnectOverlay } from "../damas3d/lobby/LobbyConnectOverlay";
import { LobbyGuestWalletPrompt } from "../damas3d/lobby/LobbyGuestWalletPrompt";
import type { LobbyView } from "./lobby/lobbyView";
import { MODE_ACCENT, TTT_THEME } from "./theme";
import type { ArenaCardData } from "../damas3d/lobby/ArenaCard3D";
import { cn } from "@/lib/utils";
import { Zap, Trophy, Users, Sparkles } from "lucide-react";

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
  activeTournament?: TournamentState | null;
  tournamentPostGame?: "won" | "lost" | null;
  tournamentFinished?: TournamentFinishedPayload | null;
  tournamentProfiles?: Record<string, PlayerProfile>;
  onExitTournament?: () => void;
  hostProfiles?: Record<string, PlayerProfile>;
  onJoinLobby?: (lobby: LobbyMatch) => void;
}

function modeIcon(mode: GameModeId) {
  if (isCasualMode(mode)) return Users;
  if (isRankedMode(mode)) return Trophy;
  if (mode.startsWith("tournament")) return Sparkles;
  return Zap;
}

export function TttLobby(props: TttLobbyProps) {
  const { t } = useTranslation();
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
    matchmakeStatus = null,
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
  const showConnectOverlay = browsing && !walletConnected && !guestModeActive;
  const hasLobbyAccess = walletConnected || guestModeActive;

  const isFreeCasualSlide =
    isCasualMode(carousel.activeMode) &&
    betSolForMode(carousel.activeMode, betSol) === 0;

  const activeModeStatus = statusFor(carousel.activeMode);
  const modeBlocked = !isPlayable(carousel.activeMode);

  const playDisabled =
    modeBlocked ||
    (isGuest && !isFreeCasualSlide) ||
    (guestModeActive && !walletConnected && !playerId) ||
    (carousel.isCustomSlide && !!validateBetSol(betSol)) ||
    (carousel.isRankedStakeSlide && !!validateRankedBetSol(betSol)) ||
    matchmakeQueued ||
    carousel.isTournamentSlide;

  const activeEntrySol = isRankedMode(carousel.activeMode)
    ? betSol
    : betSolForMode(carousel.activeMode, betSol);

  const activeLobby = activeMatchId
    ? lobbies.find((l) => l.id === activeMatchId)
    : undefined;

  const joinableLobbies = useJoinableOpenTables(lobbies, browsing && hasLobbyAccess);

  const contextOpenTables = useMemo(
    () => filterLobbiesByContext(joinableLobbies, carousel.activeMode, betSol),
    [joinableLobbies, carousel.activeMode, betSol],
  );

  const activeCard = carousel.cardDataList[carousel.index];

  return (
    <div className="ttt-lobby-root" data-view={lobbyView}>
      {browsing && (
        <div className="ttt-lobby-bg" aria-hidden>
          <div className="ttt-lobby-bg-grid" />
          <div className="ttt-lobby-bg-glow" />
        </div>
      )}

      {showConnectOverlay && (
        <LobbyConnectOverlay
          guestStarting={guestStarting}
          onPlayAsGuest={onPlayAsGuest}
        />
      )}

      {browsing && hasLobbyAccess && (
        <div className="ttt-lobby-layout">
          <aside className="ttt-mode-sidebar">
            <h2 className="ttt-sidebar-title">{t("lobby.modes")}</h2>
            <div className="ttt-mode-list">
              {carousel.cardDataList.map((card: ArenaCardData, i: number) => {
                const Icon = modeIcon(card.id as GameModeId);
                const accent = MODE_ACCENT[card.id] ?? TTT_THEME.primary;
                const active = i === carousel.index;
                const locked = card.locked;
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={cn(
                      "ttt-mode-chip",
                      active && "ttt-mode-chip-active",
                      locked && "ttt-mode-chip-locked",
                    )}
                    style={{ "--chip-accent": accent } as CSSProperties}
                    onClick={() => carousel.selectIndex(i)}
                    disabled={locked}
                  >
                    <Icon className="size-4" />
                    <span>{card.title}</span>
                    {card.badge && <span className="ttt-mode-badge">{card.badge}</span>}
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="ttt-lobby-main">
            {isGuest && !isFreeCasualSlide && activeModeStatus === "open" && (
              <LobbyGuestWalletPrompt />
            )}

            {activeCard && (
              <div
                className="ttt-hero-card"
                style={
                  {
                    "--hero-accent":
                      MODE_ACCENT[carousel.activeMode] ?? TTT_THEME.primary,
                  } as CSSProperties
                }
              >
                <div className="ttt-hero-icon" aria-hidden>
                  <svg viewBox="0 0 64 64" width="72" height="72">
                    <rect x="8" y="8" width="48" height="48" rx="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                    <line x1="24" y1="24" x2="40" y2="40" stroke={TTT_THEME.xColor} strokeWidth="3" strokeLinecap="round" />
                    <line x1="40" y1="24" x2="24" y2="40" stroke={TTT_THEME.xColor} strokeWidth="3" strokeLinecap="round" />
                    <circle cx="44" cy="20" r="6" fill="none" stroke={TTT_THEME.oColor} strokeWidth="2.5" />
                  </svg>
                </div>
                <h1 className="ttt-hero-title">{activeCard.title}</h1>
                <p className="ttt-hero-desc">{activeCard.subtitle}</p>

                {carousel.isCustomSlide && (
                  <div className="ttt-bet-row">
                    <label className="ttt-bet-label">{t("bet.amount")}</label>
                    <input
                      type="range"
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={betSol}
                      onChange={(e) => onSelectBet(parseFloat(e.target.value))}
                      className="ttt-bet-slider"
                    />
                    <span className="ttt-bet-value">{formatSolAmount(betSol)} SOL</span>
                  </div>
                )}

                <div className="ttt-hero-actions">
                  {!carousel.isTournamentSlide && !carousel.isRankedSlide && (
                    <button
                      type="button"
                      className="ttt-play-btn"
                      disabled={playDisabled || loading}
                      onClick={() => onPlay(carousel.activeMode)}
                    >
                      {isFreeCasualSlide ? (
                        t("play.free")
                      ) : (
                        <SolAmount amount={formatSolAmount(activeEntrySol)} iconClassName="size-4" suffix />
                      )}
                    </button>
                  )}

                  {carousel.isRankedSlide && (
                    <>
                      <button
                        type="button"
                        className="ttt-play-btn ttt-play-btn-secondary"
                        disabled={playDisabled || loading || matchmakeQueued}
                        onClick={() => onRankedMatchmake?.()}
                      >
                        {matchmakeQueued ? t("ranked.searching") : t("ranked.findMatch")}
                      </button>
                      <button
                        type="button"
                        className="ttt-play-btn"
                        disabled={playDisabled || loading}
                        onClick={() =>
                          onRankedOpenTable?.() ?? onPlay(carousel.activeMode)
                        }
                      >
                        {t("ranked.openTable")}
                      </button>
                      {matchmakeQueued && (
                        <button type="button" className="ttt-cancel-btn" onClick={() => onRankedCancel?.()}>
                          {t("ranked.cancel")}
                        </button>
                      )}
                    </>
                  )}

                  {carousel.isTournamentSlide && (
                    <button
                      type="button"
                      className="ttt-play-btn"
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
                </div>

                <button
                  type="button"
                  className="ttt-open-tables-btn"
                  onClick={() => setOpenTablesOpen((o) => !o)}
                >
                  {t("openTables.title")} ({contextOpenTables.length})
                </button>
              </div>
            )}
          </main>
        </div>
      )}

      {browsing && hasLobbyAccess && (
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
        <div className="ttt-stage-overlay">
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
              <div className="ttt-stage-empty">
                <p>{t("game.boardUnavailable")}</p>
                <button type="button" className="ttt-stage-empty-btn" onClick={onExitLobbyView}>
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
