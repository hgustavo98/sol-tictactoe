import { useEffect, useRef, useState } from "react";
import { ChevronDown, Flag, ScrollText } from "lucide-react";
import { trainingBtn } from "../../damas3d/lobby/lobbyClasses";
import { useTranslation } from "react-i18next";
import {
  computeBetBreakdown,
  displayPlayerName,
  rankedStakeMultiplier,
  tournamentRatingMultiplierFromEntry,
  type GameState,
  type PlayerProfile,
  type TournamentState,
} from "@sol-tictactoe/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResignConfirmDialog } from "../ResignConfirmDialog";
import { PlayerAvatar } from "../player/PlayerAvatar";
import { PlayerColorBadge } from "../../damas3d/components/PlayerColorBadge";
import { CopyNameButton } from "../player/CopyNameButton";
import { PlayerRatingBlock } from "../player/PlayerRatingBlock";
import { TournamentBracketPanel } from "../tournament/TournamentBracketPanel";
import { ProfileStakesCard } from "./ProfileStakesCard";
import { RatingModeBadge } from "../rating/RatingModeBadge";
import { useCompactLayout } from "../../hooks/useCompactLayout";

interface GameSideRailPlayerProps {
  profile: PlayerProfile;
  label?: string;
  tone: "player" | "opponent";
  isActiveTurn?: boolean;
  turnLabel?: string;
}

function GameSideRailPlayer({
  profile,
  label,
  tone,
  isActiveTurn = false,
  turnLabel,
}: GameSideRailPlayerProps) {
  const { t } = useTranslation();
  const name = displayPlayerName(profile, t("profile.guest"));

  return (
    <div
      className={cn(
        "profile-game-rail-player",
        tone === "opponent" && "profile-game-rail-player-opponent",
        isActiveTurn && "profile-game-rail-player-active",
      )}
    >
      <PlayerAvatar profile={profile} size="sm" className="profile-game-rail-player-avatar" />
      <div className="profile-game-rail-player-meta">
        {label && (
          <span className="profile-game-rail-player-label">{label}</span>
        )}
        <span className="profile-game-rail-player-name">{name}</span>
        <span className="profile-game-rail-player-elo">
          {t("profile.rating")} {profile.rating}
        </span>
      </div>
      <div className="profile-game-rail-player-badges">
        {isActiveTurn && turnLabel && (
          <Badge
            variant={tone === "player" ? "default" : "outline"}
            className="profile-game-rail-turn"
          >
            {turnLabel}
          </Badge>
        )}
      </div>
    </div>
  );
}

export interface ProfileCompactChipProps {
  connected?: boolean;
  profile?: PlayerProfile | null;
  game?: GameState | null;
  onResign?: () => void;
  onBackToLobby?: () => void;
  playerId?: string;
  opponentWallet?: string;
  opponentProfile?: PlayerProfile | null;
  activeTournament?: TournamentState | null;
  activeMatchId?: string | null;
  tournamentProfiles?: Record<string, PlayerProfile>;
  countsForRating?: boolean;
  isTournamentMatch?: boolean;
  onOpenRules?: () => void;
  /** In-game: perfil à esquerda; ações (regras/desistir) ficam na barra direita. */
  splitActionsRail?: boolean;
  /** Dentro da faixa esquerda do shell (menu, jogo, treino). */
  inLeftRail?: boolean;
}

export function ProfileCompactChip({
  connected,
  profile,
  game,
  onResign,
  onBackToLobby,
  playerId,
  opponentWallet,
  opponentProfile,
  activeTournament,
  activeMatchId,
  tournamentProfiles = {},
  countsForRating = false,
  isTournamentMatch = false,
  onOpenRules,
  splitActionsRail = false,
  inLeftRail = false,
}: ProfileCompactChipProps) {
  const { t } = useTranslation();
  const compact = useCompactLayout();
  const [expanded, setExpanded] = useState(() => !compact);
  const [resignOpen, setResignOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const rootRef = useRef<HTMLDivElement>(null);
  const identity = playerId;
  const hasPlayerSession = Boolean(identity);

  useEffect(() => {
    if (!game?.reconnectDeadlineMs) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [game?.reconnectDeadlineMs]);

  useEffect(() => {
    setExpanded(!compact);
  }, [game?.matchId, compact]);

  if (!hasPlayerSession || !profile) return null;

  const displayName = displayPlayerName(
    profile ?? { wallet: identity!, nickname: null },
    t("profile.guest"),
  );

  const myColor =
    game && identity
      ? identity === game.playerWhite
        ? "w"
        : identity === game.playerBlack
          ? "b"
          : null
      : null;
  const isMyTurn =
    game && myColor ? myColor === game.turn && game.status === "playing" : false;
  const breakdown = game
    ? computeBetBreakdown(game.betLamports, game.rakeBps)
    : null;
  const inGame = Boolean(game && breakdown);

  const opponentData: PlayerProfile | null =
    opponentWallet != null
      ? (opponentProfile ?? {
          wallet: opponentWallet,
          nickname: null,
          avatarUrl: null,
          rating: 500,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          updatedAt: 0,
        })
      : null;

  const graceRemaining =
    game?.reconnectDeadlineMs != null
      ? Math.max(0, game.reconnectDeadlineMs - now)
      : null;
  const graceLabel =
    graceRemaining != null
      ? `${Math.floor(graceRemaining / 60000)}:${Math.ceil((graceRemaining % 60000) / 1000)
          .toString()
          .padStart(2, "0")}`
      : "";

  const opponentColor =
    myColor === "w" ? "b" : myColor === "b" ? "w" : null;
  const opponentTurn =
    game && opponentColor
      ? opponentColor === game.turn && game.status === "playing"
      : false;

  return (
    <div
      ref={rootRef}
      className={cn(
        "profile-compact-chip",
        (inGame || inLeftRail) && "profile-game-rail",
        inGame && splitActionsRail && "profile-game-rail-split",
        expanded && "profile-compact-chip-expanded",
      )}
    >
      {inGame && myColor && splitActionsRail && (
        <PlayerColorBadge
          color={myColor}
          className="profile-game-rail-piece-top"
        />
      )}

      {inGame && opponentData && (
        <GameSideRailPlayer
          profile={opponentData}
          label={t("profile.opponent")}
          tone="opponent"
          isActiveTurn={opponentTurn}
          turnLabel={opponentTurn ? t("damas3d.opponentTurn") : undefined}
        />
      )}

      <button
        type="button"
        className={cn(
          "profile-compact-chip-trigger profile-compact-chip-trigger-rail",
          inGame && isMyTurn && "profile-game-rail-player-active",
        )}
        aria-expanded={expanded}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((open) => !open);
        }}
      >
          <PlayerAvatar profile={profile} size="sm" className="profile-compact-chip-avatar" />
          <span className="profile-compact-chip-meta">
            <span className="profile-compact-chip-name">{displayName}</span>
            <span className="profile-compact-chip-rating">
              <span
                className={cn(
                  "profile-status-dot",
                  connected ? "online" : "offline",
                )}
              />
              {t("profile.rating")} {profile.rating}
            </span>
          </span>
          {!inGame && game && isMyTurn && (
            <Badge variant="default" className="profile-compact-chip-turn">
              {t("profile.yourTurn")}
            </Badge>
          )}
          {!inGame && game && !isMyTurn && (
            <Badge variant="outline" className="profile-compact-chip-turn">
              {game.turn === "w" ? t("profile.white") : t("profile.black")}
            </Badge>
          )}
          {inGame && isMyTurn && (
            <Badge variant="default" className="profile-game-rail-turn">
              {t("profile.yourTurn")}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              "profile-compact-chip-chevron size-3.5 shrink-0",
              expanded && "profile-compact-chip-chevron-open",
            )}
            aria-hidden
          />
      </button>

      {inGame && onOpenRules && !splitActionsRail && (
        <button
          type="button"
          onClick={onOpenRules}
          className={cn(trainingBtn, "profile-game-rail-rules")}
          aria-label={t("profile.rules.button")}
        >
          <ScrollText className="size-4 shrink-0 text-amber-300" strokeWidth={2.25} />
          {t("profile.rules.button")}
        </button>
      )}

      {expanded && (
        <div className="profile-compact-chip-panel custom-scrollbar">
          <div className="profile-compact-chip-panel-head">
            <span className="profile-compact-chip-panel-name">{displayName}</span>
            <CopyNameButton value={displayName} />
          </div>

          <PlayerRatingBlock profile={profile} variant="compact" tone="player" />

          {activeTournament && (
            <TournamentBracketPanel
              tournament={activeTournament}
              wallet={identity}
              activeMatchId={activeMatchId}
              profiles={tournamentProfiles}
              compact
            />
          )}

          {inGame && breakdown && (
            <div className="profile-compact-chip-game">
              {countsForRating && opponentData && game && (
                <RatingModeBadge
                  countsForRating
                  myRating={profile.rating}
                  myGamesPlayed={profile.gamesPlayed}
                  opponentRating={opponentData.rating}
                  isTournament={isTournamentMatch}
                  ratingMultiplier={
                    isTournamentMatch
                      ? tournamentRatingMultiplierFromEntry(game.betLamports)
                      : rankedStakeMultiplier(game.betLamports)
                  }
                  className="profile-elo-badge"
                />
              )}

              {!splitActionsRail && (
                <ProfileStakesCard breakdown={breakdown} variant="inline" />
              )}

              <div className="profile-compact-chip-moves">
                {game!.moves.length === 0 ? (
                  <span>{t("profile.noMoves")}</span>
                ) : (
                  game!.moves.map((m, i) => (
                    <div key={i}>
                      <span className="text-foreground/50">{i + 1}.</span> {m}
                    </div>
                  ))
                )}
              </div>

              {game!.disconnectedPlayer && graceLabel && (
                <p className="profile-compact-chip-alert">
                  {game!.disconnectedPlayer === identity
                    ? t("profile.youDisconnectedNotice", { time: graceLabel })
                    : t("profile.opponentDisconnectedNotice", {
                        time: graceLabel,
                      })}
                </p>
              )}

              {onBackToLobby && (
                <div className="profile-compact-chip-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={onBackToLobby}
                  >
                    {t("profile.backToLobby")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {inGame && game && !splitActionsRail && (
        <div className="profile-game-rail-footer">
          {game.status === "playing" && myColor && onResign && (
            <Button
              variant="destructive"
              size="sm"
              className="profile-game-rail-resign w-full"
              onClick={() => setResignOpen(true)}
            >
              <Flag className="size-3.5" />
              {t("profile.resign")}
            </Button>
          )}
        </div>
      )}

      {onResign && !splitActionsRail && (
        <ResignConfirmDialog
          open={resignOpen}
          onOpenChange={setResignOpen}
          onConfirm={onResign}
          hasBet={(game?.betLamports ?? 0) > 0}
        />
      )}
    </div>
  );
}
