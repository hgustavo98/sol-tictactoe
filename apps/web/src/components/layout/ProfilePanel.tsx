import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Flag } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  computeBetBreakdown,
  displayPlayerName,
  type GameState,
  type PlayerProfile,
  type TournamentState,
} from "@sol-tictactoe/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ResignConfirmDialog } from "../ResignConfirmDialog";
import { PlayerAvatar } from "../player/PlayerAvatar";
import { CopyNameButton } from "../player/CopyNameButton";
import { PlayerRatingBlock } from "../player/PlayerRatingBlock";
import { TournamentBracketPanel } from "../tournament/TournamentBracketPanel";
import { ProfileStakesCard } from "./ProfileStakesCard";
import { BrandLogo } from "../icons/BrandLogo";
import {
  rankedStakeMultiplier,
  tournamentRatingMultiplierFromEntry,
} from "@sol-tictactoe/shared";
import { RatingModeBadge } from "../rating/RatingModeBadge";

interface ProfilePanelProps {
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
}

const PROFILE_RULE_KEYS = [
  "forfeit",
  "winner",
  "draw",
  "timeout",
  "escrow",
  "cancelEarly",
  "waitingDisconnect",
  "rating",
] as const;

function ProfileLobbyRules() {
  const { t } = useTranslation();

  return (
    <div className="profile-rules custom-scrollbar">
      <h3 className="profile-rules-title">{t("profile.rules.title")}</h3>
      <ul className="profile-rules-list">
        {PROFILE_RULE_KEYS.map((key) => (
          <li key={key}>{t(`profile.rules.${key}`)}</li>
        ))}
      </ul>
    </div>
  );
}

export function ProfilePanel({
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
}: ProfilePanelProps) {
  const { t } = useTranslation();
  const [resignOpen, setResignOpen] = useState(false);
  const [localProfile, setLocalProfile] = useState<PlayerProfile | null>(null);
  const [now, setNow] = useState(Date.now());
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58();
  const identity = playerId ?? wallet;
  const hasPlayerSession = Boolean(identity);
  const activeProfile = localProfile ?? profile;

  useEffect(() => {
    setLocalProfile(null);
  }, [profile?.wallet, profile?.updatedAt, profile?.nickname, profile?.avatarUrl]);

  useEffect(() => {
    if (!game?.reconnectDeadlineMs) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [game?.reconnectDeadlineMs]);

  const displayName = displayPlayerName(
    activeProfile ?? (identity ? { wallet: identity, nickname: null } : null),
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

  const showMatchRules = !game && !activeTournament;

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

  return (
    <aside className="profile-panel-outer">
      <div className="profile-panel">
        <div className="profile-brand-block">
          <div className="profile-logo" aria-hidden>
            <BrandLogo size={56} />
          </div>
          <h1 className="profile-brand">{t("app.title")}</h1>
        </div>

        {(hasPlayerSession || showMatchRules) && (
        <Card className="profile-card">
          {hasPlayerSession && (
          <CardHeader className="pb-1 pt-3 px-4 flex-shrink-0">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("profile.player")}
            </CardTitle>
          </CardHeader>
          )}
          <div
            className={cn(
              "profile-card-body px-4 pb-4",
              hasPlayerSession ? "pt-0" : "pt-3",
            )}
          >
            {hasPlayerSession && (
            <>
            <div className="profile-wallet-row flex-shrink-0">
              <PlayerAvatar
                profile={
                  activeProfile ??
                  (identity ? { wallet: identity, nickname: null, avatarUrl: null } : null)
                }
                size="md"
                className="profile-wallet-avatar"
              />
              <div className="min-w-0 flex-1">
                <div className="profile-name-row">
                  <div className="font-mono font-semibold truncate">{displayName}</div>
                  <CopyNameButton value={displayName} />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn(
                      "profile-status-dot",
                      connected ? "online" : "offline",
                    )}
                  />
                  <span className="text-xs text-muted-foreground">
                    {connected ? t("profile.connected") : t("profile.offline")}
                  </span>
                </div>
              </div>
            </div>

            {profile && (
              <PlayerRatingBlock
                profile={profile}
                variant={inGame ? "compact" : "full"}
                tone="player"
              />
            )}

            {inGame && opponentData && (
              <PlayerRatingBlock
                profile={opponentData}
                variant="compact"
                tone="opponent"
                label={t("profile.opponent")}
                showIdentity
              />
            )}

            {activeTournament && (
              <TournamentBracketPanel
                tournament={activeTournament}
                wallet={identity}
                activeMatchId={activeMatchId}
                profiles={tournamentProfiles}
                compact
              />
            )}
            </>
            )}

            {hasPlayerSession && game && breakdown ? (
              <div className="profile-game-hud">
                {countsForRating && profile && opponentData && game && (
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
                <div className="profile-game-hud-bar">
                  <div className="profile-game-hud-player">
                    <PlayerAvatar
                      profile={
                        activeProfile ??
                        (identity ? { wallet: identity, nickname: null, avatarUrl: null } : null)
                      }
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="profile-game-hud-name font-mono font-semibold truncate">
                        {displayName}
                      </div>
                      <div className="profile-game-hud-connected flex items-center gap-1">
                        <span
                          className={cn(
                            "profile-status-dot",
                            connected ? "online" : "offline",
                          )}
                        />
                        <span className="text-[0.6rem] text-muted-foreground">
                          {connected ? t("profile.connected") : t("profile.offline")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="profile-game-hud-status">
                    <Badge variant={isMyTurn ? "default" : "outline"}>
                      {isMyTurn
                        ? t("profile.yourTurn")
                        : game.turn === "w"
                          ? t("profile.white")
                          : t("profile.black")}
                    </Badge>
                  </div>

                  <ProfileStakesCard breakdown={breakdown} variant="inline" />

                  {game.status === "playing" && myColor && onResign && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="profile-game-hud-resign"
                      onClick={() => setResignOpen(true)}
                    >
                      <Flag className="size-3.5" />
                      <span className="profile-game-hud-resign-label">
                        {t("profile.resign")}
                      </span>
                    </Button>
                  )}
                </div>

                <div className="profile-game-hud-extra">
                  <ProfileStakesCard breakdown={breakdown} className="profile-stakes-card-desktop" />

                  <div className="profile-game-hud-extra-desktop space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("profile.status")}
                      </span>
                      <Badge variant={isMyTurn ? "default" : "outline"}>
                        {isMyTurn
                          ? t("profile.yourTurn")
                          : game.turn === "w"
                            ? t("profile.white")
                            : t("profile.black")}
                      </Badge>
                    </div>
                  </div>

                  <div className="profile-game-hud-scroll custom-scrollbar">
                  <div className="profile-game-hud-moves space-y-0.5 font-mono text-[0.7rem] text-muted-foreground">
                    {game.moves.length === 0 ? (
                      <span>{t("profile.noMoves")}</span>
                    ) : (
                      game.moves.map((m, i) => (
                        <div key={i}>
                          <span className="text-foreground/50">{i + 1}.</span> {m}
                        </div>
                      ))
                    )}
                  </div>

                  {game.disconnectedPlayer && graceLabel && (
                    <p className="profile-game-hud-alert rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-2 text-[0.68rem] leading-snug text-amber-100/90">
                      {game.disconnectedPlayer === identity
                        ? t("profile.youDisconnectedNotice", { time: graceLabel })
                        : t("profile.opponentDisconnectedNotice", {
                            time: graceLabel,
                          })}
                    </p>
                  )}

                  </div>

                  <div className="profile-game-hud-actions">
                  {game.status === "playing" && myColor && onResign && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="profile-game-hud-resign-desktop w-full"
                      onClick={() => setResignOpen(true)}
                    >
                      <Flag className="size-3.5" />
                      {t("profile.resign")}
                    </Button>
                  )}

                  {onBackToLobby && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="profile-game-hud-back w-full text-muted-foreground"
                      onClick={onBackToLobby}
                    >
                      {t("profile.backToLobby")}
                    </Button>
                  )}
                  </div>
                </div>
              </div>
            ) : (
              showMatchRules && (
                <div className="profile-lobby-footer">
                  <ProfileLobbyRules />
                </div>
              )
            )}
          </div>
        </Card>
        )}
      </div>
      {onResign && (
        <ResignConfirmDialog
          open={resignOpen}
          onOpenChange={setResignOpen}
          onConfirm={onResign}
          hasBet={(game?.betLamports ?? 0) > 0}
        />
      )}
    </aside>
  );
}
