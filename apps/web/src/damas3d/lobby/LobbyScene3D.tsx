import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { PerspectiveCamera } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import type { GameState, LobbyMatch, MatchmakeStatusPayload, TournamentFinishedPayload, TournamentQueueStatus, TournamentState, PlayerProfile } from "@sol-tictactoe/shared";
import type { Socket } from "socket.io-client";
import { formatSolAmount, validateBetSol, validateRankedBetSol } from "../../config/bets";
import {
  betSolForMode,
  isCasualMode,
  isRankedMode,
  type GameModeId,
} from "../../config/gameModes";
import { useCompactLayout, isSheetLayout } from "../../hooks/useCompactLayout";
import { SolAmount } from "@/components/icons/SolanaIcon";
import { OpenTablesSheet } from "@/components/arena/OpenTablesSheet";
import { ChessGame } from "@/components/ChessGame";
import { filterLobbiesByContext } from "../../lib/openTablesFilter";
import { useModeAvailability } from "../../hooks/useModeAvailability";
import { useJoinableOpenTables } from "../../hooks/useJoinableOpenTables";
import { WaitingRoom } from "@/components/WaitingRoom";
import { TournamentWaitingRoom } from "@/components/tournament/TournamentWaitingRoom";
import { GameModalErrorBoundary } from "@/components/GameModalErrorBoundary";
import { TrainingGame3D } from "../training/TrainingGame3D";
import { useLobbyCameraConfig } from "../cameraConfig";
import { DOPAMINE } from "./dopamineColors";
import { ArenaCard3D } from "./ArenaCard3D";
import { LobbyActionsBar } from "./LobbyActionsBar";
import { LobbyConnectOverlay } from "./LobbyConnectOverlay";
import { LobbyGuestWalletPrompt } from "./LobbyGuestWalletPrompt";
import { LobbyFloor, LobbyParticles } from "./LobbyEnvironment";
import { lobbyCanvas, lobbySceneRoot, lobbyStageOverlay } from "./lobbyClasses";
import type { LobbyView } from "./lobbyView";
import {
  carouselGroupY,
  useLobbyViewportTier,
} from "./lobbyCarouselLayout";
import { usePortraitMobile } from "../../hooks/usePortraitMobile";
import {
  useLobbyCarousel,
  wrapCarouselOffset,
} from "./useLobbyCarousel";

interface LobbyCarousel3DProps {
  showCarousel: boolean;
  minimalScene: boolean;
  compact: boolean;
  index: number;
  slideCount: number;
  cardDataList: ReturnType<typeof useLobbyCarousel>["cardDataList"];
  onSelectIndex: (i: number) => void;
}

function LobbyCarousel3D({
  showCarousel,
  minimalScene,
  compact,
  index,
  slideCount,
  cardDataList,
  onSelectIndex,
}: LobbyCarousel3DProps) {
  const camera = useLobbyCameraConfig(minimalScene);
  const tier = useLobbyViewportTier();
  const portrait = usePortraitMobile();
  const carouselY = carouselGroupY(tier, portrait);

  if (minimalScene) {
    return (
      <>
        <PerspectiveCamera makeDefault position={camera.position} fov={camera.fov} />
        <LobbyFloor compact={compact} />
        <LobbyParticles />
      </>
    );
  }

  return (
    <>
      <PerspectiveCamera makeDefault position={camera.position} fov={camera.fov} />
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 5, 3]} intensity={2.2} color={DOPAMINE.sky} />
      <pointLight position={[-4, 4, 2]} intensity={1.8} color={DOPAMINE.cyan} />
      <pointLight position={[0, 6, -2]} intensity={1.2} color={DOPAMINE.electric} />
      <directionalLight position={[2, 8, 4]} intensity={0.75} color="#ffd4b8" />

      <LobbyFloor compact={compact} />
      <LobbyParticles />

      {showCarousel && (
        <group position={[0, carouselY, 0]}>
          {cardDataList.map((data, i) => {
            const offset = wrapCarouselOffset(i, index, slideCount);
            return (
              <ArenaCard3D
                key={data.id}
                data={data}
                offset={offset}
                locked={data.locked}
                onSelect={() => onSelectIndex(i)}
              />
            );
          })}
        </group>
      )}
    </>
  );
}

export interface LobbyScene3DProps {
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
  matchmakeQueued: boolean;
  matchmakeStatus: MatchmakeStatusPayload | null;
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

export function LobbyScene3D({
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
  matchmakeQueued,
  matchmakeStatus,
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
  allTournamentQueues = [],
  tournamentRegistered = false,
  onTournamentRegister,
  onTournamentUnregister,
  onExitLobbyView,
  onCancelWaiting,
  activeTournament,
  tournamentPostGame,
  tournamentFinished,
  tournamentProfiles,
  onExitTournament,
  hostProfiles = {},
  onJoinLobby,
}: LobbyScene3DProps) {
  const { t } = useTranslation();
  const isCompact = useCompactLayout();
  const { isPlayable, statusFor } = useModeAvailability();
  const [openTablesOpen, setOpenTablesOpen] = useState(() => !isSheetLayout());

  const carousel = useLobbyCarousel({
    lobbies,
    betSol,
    onSelectBet,
    onModeChange,
    tournamentQueue,
    allTournamentQueues,
    isGuest,
    myProfile: myProfile
      ? { rating: myProfile.rating, gamesPlayed: myProfile.gamesPlayed }
      : null,
  });

  const browsing = lobbyView === "browse";
  const showLobbyCanvas =
    lobbyView === "browse" ||
    lobbyView === "waiting" ||
    lobbyView === "tournament-wait";
  const showConnectOverlay =
    browsing && !walletConnected && !guestModeActive;
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

  const rankedDisabled =
    modeBlocked || isGuest || carousel.rankedStakeInvalid;
  const tournamentDisabled = isGuest || modeBlocked;

  const activeEntrySol = isRankedMode(carousel.activeMode)
    ? betSol
    : betSolForMode(carousel.activeMode, betSol);

  const entryLabel = isFreeCasualSlide ? (
    t("play.free")
  ) : (
    <SolAmount
      amount={formatSolAmount(activeEntrySol)}
      iconClassName="size-3"
      suffix
    />
  );

  const isGuestLockedSlide =
    isGuest && !isFreeCasualSlide && activeModeStatus === "open";

  const tournamentWaitingLabel = tournamentQueue
    ? t("tournament.waiting", {
        current: tournamentQueue.registered,
        total: tournamentQueue.needed,
      })
    : undefined;

  const activeLobby = activeMatchId
    ? lobbies.find((l) => l.id === activeMatchId)
    : undefined;

  const joinableLobbies = useJoinableOpenTables(lobbies, browsing && hasLobbyAccess);

  const contextOpenTables = useMemo(
    () => filterLobbiesByContext(joinableLobbies, carousel.activeMode, betSol),
    [joinableLobbies, carousel.activeMode, betSol],
  );

  return (
    <div
      className={lobbySceneRoot}
      data-open-tables={openTablesOpen ? "open" : "closed"}
    >
      {showLobbyCanvas && (
      <Canvas
        className={lobbyCanvas}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: true, alpha: isCompact, premultipliedAlpha: false }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFShadowMap;
          if (isCompact) {
            gl.setClearColor(0x0f2840, 1);
          } else {
            gl.setClearColor(0x000000, 0);
          }
        }}
        dpr={isCompact ? [1, 1.25] : [1, 1.75]}
        shadows={!isCompact}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
      >
        {isCompact ? (
          <fog attach="fog" args={[DOPAMINE.navyMid, 8, 48]} />
        ) : (
          <fog attach="fog" args={[DOPAMINE.bg, 6, 42]} />
        )}
        <Suspense fallback={null}>
          <LobbyCarousel3D
            showCarousel={browsing && hasLobbyAccess}
            minimalScene={showConnectOverlay || lobbyView === "tournament-wait"}
            compact={isCompact}
            index={carousel.index}
            slideCount={carousel.slideCount}
            cardDataList={carousel.cardDataList}
            onSelectIndex={carousel.selectIndex}
          />
        </Suspense>
        {!isCompact && (
          <EffectComposer>
            <Bloom
              intensity={1.1}
              luminanceThreshold={0.18}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
          </EffectComposer>
        )}
      </Canvas>
      )}

      {showConnectOverlay && (
        <LobbyConnectOverlay
          guestStarting={guestStarting}
          onPlayAsGuest={onPlayAsGuest}
        />
      )}

      {browsing && hasLobbyAccess && isGuest && isGuestLockedSlide && (
        <LobbyGuestWalletPrompt />
      )}
      {browsing && hasLobbyAccess && !(isGuest && isGuestLockedSlide) && (
        <LobbyActionsBar
          playLabel={t("play.title")}
          entryLabel={entryLabel}
          tournamentLabel={t("tournament.join")}
          playHint={
            carousel.isCustomSlide
              ? t("play.hintOpenTable", {
                  amount: formatSolAmount(activeEntrySol),
                })
              : isFreeCasualSlide
                ? t("play.hintOpenTableFree")
                : t("play.hintNoRating")
          }
          rankedHint={
            carousel.isRankedStakeSlide
              ? t("ranked.hintOpenTable", {
                  amount: formatSolAmount(activeEntrySol),
                })
              : t("ranked.hint", {
                  amount: formatSolAmount(activeEntrySol),
                })
          }
          tournamentHint={t("tournament.hint")}
          playDisabled={playDisabled}
          rankedDisabled={rankedDisabled}
          tournamentDisabled={tournamentDisabled}
          loading={loading}
          matchmakeQueued={matchmakeQueued}
          matchmakeStatus={matchmakeStatus}
          onPlay={() => onPlay(carousel.activeMode)}
          onRankedMatchmake={onRankedMatchmake ?? (() => {})}
          onRankedOpenTable={() =>
            onRankedOpenTable?.() ?? onPlay(carousel.activeMode)
          }
          onRankedCancel={onRankedCancel ?? (() => {})}
          isRankedMode={carousel.isRankedSlide}
          isRankedStakeMode={carousel.isRankedStakeSlide}
          isCustomMode={carousel.isCustomSlide}
          isFreeCasualMode={isFreeCasualSlide}
          isTournamentMode={carousel.isTournamentSlide}
          activeMode={carousel.activeMode}
          tournamentRegistered={tournamentRegistered}
          tournamentWaitingLabel={tournamentWaitingLabel}
          onTournamentRegister={onTournamentRegister}
          onTournamentUnregister={onTournamentUnregister}
          openTablesCount={contextOpenTables.length}
          openTablesActive={openTablesOpen}
          onOpenTables={() => setOpenTablesOpen((open) => !open)}
        />
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
        <div className={lobbyStageOverlay}>
          <GameModalErrorBoundary key={lobbyView} onReset={onExitLobbyView}>
            {lobbyView === "training" && (
              <TrainingGame3D embedded onExit={onExitLobbyView} />
            )}
            {lobbyView === "game" && gameState && playerId && socket && (
              <ChessGame
                embedded
                socket={socket}
                game={gameState}
                playerId={playerId}
                myProfile={myProfile}
                opponentProfile={opponentProfile}
              />
            )}
            {lobbyView === "game" && (!gameState || !playerId || !socket) && (
              <div className="lobby-stage-empty">
                <p>{t("game.boardUnavailable")}</p>
                <button type="button" className="lobby-stage-empty-btn" onClick={onExitLobbyView}>
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
