import { useMemo, useState } from "react";
import { Search, Trophy, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  CUSTOM_RAKE_BPS,
  displayPlayerName,
  isRankedLobby,
  isTournamentMode,
  lamportsToSol,
  lobbyCountsForRating,
  oneVOnePrizeSol,
  openTableMatchesSearch,
  RATING_EVEN_MATCH,
  rakeBpsForMode,
  ratingTierId,
  type GameModeId,
  type LobbyMatch,
  type PlayerProfile,
  type TournamentQueueStatus,
} from "@sol-tictactoe/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatSolAmount } from "../../config/bets";
import { SolAmount } from "@/components/icons/SolanaIcon";
import { filterLobbiesByContext } from "../../lib/openTablesFilter";
import { useNarrowLayout } from "../../hooks/useNarrowLayout";
import { useMobileLayout } from "../../hooks/useMobileLayout";
import { PlayerAvatar } from "../player/PlayerAvatar";
import { RatingModeBadge } from "../rating/RatingModeBadge";

export type ModeFilter = "all" | "casual" | "custom" | "ranked" | "tournament";

function lobbyModeCategory(lobby: LobbyMatch): Exclude<ModeFilter, "all"> {
  if (
    lobby.tournamentId ||
    (lobby.gameMode && isTournamentMode(lobby.gameMode as GameModeId))
  ) {
    return "tournament";
  }
  if (isRankedLobby(lobby)) return "ranked";
  if (lobby.gameMode === "custom1v1") return "custom";
  return "casual";
}

function matchesModeFilter(lobby: LobbyMatch, filter: ModeFilter): boolean {
  if (filter === "all") return true;
  return lobbyModeCategory(lobby) === filter;
}

interface OpenTablesPanelProps {
  lobbies: LobbyMatch[];
  playerId?: string;
  isGuest?: boolean;
  myRating?: number;
  myGamesPlayed?: number;
  hostProfiles?: Record<string, PlayerProfile>;
  loading?: boolean;
  onJoin: (lobby: LobbyMatch) => void;
  /** When set, filters tables to the active carousel mode/stake (no mode tabs). */
  contextMode?: GameModeId;
  contextBetSol?: number;
  tournamentQueue?: TournamentQueueStatus | null;
  layout?: "sidebar" | "modal" | "sheet";
}

interface OpenTablesListProps extends OpenTablesPanelProps {}

function sortByRatingProximity(
  list: LobbyMatch[],
  myRating?: number,
): LobbyMatch[] {
  if (myRating == null) return list;
  return [...list].sort((a, b) => {
    const gapA = Math.abs((a.player1Rating ?? myRating) - myRating);
    const gapB = Math.abs((b.player1Rating ?? myRating) - myRating);
    if (gapA !== gapB) return gapA - gapB;
    return b.createdAt - a.createdAt;
  });
}

function lobbyRakeBps(lobby: LobbyMatch): number {
  if (lobby.rakeBps != null) return lobby.rakeBps;
  if (lobby.gameMode) return rakeBpsForMode(lobby.gameMode as GameModeId);
  if (lobby.ranked) return 200;
  return CUSTOM_RAKE_BPS;
}

function lobbyPrizeSol(lobby: LobbyMatch): number {
  const betSol = lamportsToSol(lobby.betLamports);
  return oneVOnePrizeSol(betSol, lobbyRakeBps(lobby));
}

interface OpenTableCardProps {
  lobby: LobbyMatch;
  hostProfile?: PlayerProfile;
  myRating?: number;
  myGamesPlayed?: number;
  playerId?: string;
  isGuest?: boolean;
  loading?: boolean;
  compact?: boolean;
  onJoin: (lobby: LobbyMatch) => void;
}

function OpenTableCard({
  lobby,
  hostProfile,
  myRating,
  myGamesPlayed = 0,
  playerId,
  isGuest = false,
  loading,
  compact = false,
  onJoin,
}: OpenTableCardProps) {
  const { t } = useTranslation();
  const hostRating = lobby.player1Rating;
  const gap =
    myRating != null && hostRating != null
      ? Math.abs(hostRating - myRating)
      : null;
  const evenMatch = gap != null && gap <= RATING_EVEN_MATCH;
  const betSol = lamportsToSol(lobby.betLamports);
  const isFree = lobby.betLamports === 0;
  const prizeSol = isFree ? 0 : lobbyPrizeSol(lobby);
  const rakePercent = lobbyRakeBps(lobby) / 100;
  const hostName = displayPlayerName(
    hostProfile ?? { wallet: lobby.player1, nickname: null },
    t("profile.guest"),
  );

  const modeKey = lobby.tournamentId
    ? "tournament"
    : isRankedLobby(lobby)
      ? "ranked"
      : lobby.gameMode === "custom1v1"
        ? "custom"
        : "casual";

  const countsForRating = lobbyCountsForRating(lobby);

  const disabled =
    loading ||
    (playerId != null && lobby.player1 === playerId) ||
    (isGuest && lobby.betLamports > 0);

  return (
    <div className={cn("open-table-card", compact && "open-table-card-compact")}>
      <div className="open-table-card-head">
        <div className="open-table-player">
          <PlayerAvatar
            profile={hostProfile ?? { wallet: lobby.player1 }}
            size="sm"
            className="open-table-avatar"
          />
          <div className="min-w-0">
            <span className="open-table-field-label">
              {t("openTables.opponent")}
            </span>
            <span className="open-table-wallet">{hostName}</span>
            {hostRating != null && (
              <div className="open-table-rating-line">
                <span className="open-table-rating-value">{hostRating}</span>
                <span className="open-table-rating-tier">
                  {t(`rating.tiers.${ratingTierId(hostRating)}`)}
                </span>
                {gap != null && (
                  <span
                    className={cn(
                      "open-table-rating-gap",
                      evenMatch && "open-table-rating-gap-even",
                    )}
                  >
                    {t("openTables.ratingGap", { gap })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="open-table-mode-col">
          <span className={cn("open-table-mode", `open-table-mode-${modeKey}`)}>
            {(isRankedLobby(lobby) || lobby.tournamentId) && (
              <Trophy className="size-2.5 shrink-0" aria-hidden />
            )}
            {t(`openTables.mode.${modeKey}`)}
          </span>
          <RatingModeBadge
            className="open-table-rating-badge"
            countsForRating={countsForRating}
            myRating={myRating}
            myGamesPlayed={myGamesPlayed}
            opponentRating={hostRating}
            isTournament={Boolean(lobby.tournamentId)}
            variant="compact"
          />
        </div>
      </div>

      <div className="open-table-stakes">
        {isFree ? (
          <div className="open-table-stake-block">
            <span className="open-table-field-label">{t("openTables.entry")}</span>
            <span className="open-table-stake-value text-emerald-300">
              {t("arena.free")}
            </span>
          </div>
        ) : (
          <>
            <div className="open-table-stake-block">
              <span className="open-table-field-label">{t("openTables.entry")}</span>
              <SolAmount
                amount={formatSolAmount(betSol)}
                suffix
                iconClassName="size-3"
                className="open-table-stake-value"
              />
            </div>
            <div className="open-table-stakes-arrow" aria-hidden>
              →
            </div>
            <div className="open-table-stake-block open-table-stake-block-prize">
              <span className="open-table-field-label">{t("openTables.prize")}</span>
              <SolAmount
                amount={formatSolAmount(prizeSol)}
                suffix
                iconClassName="size-3"
                className="open-table-stake-value open-table-stake-value-prize"
              />
            </div>
          </>
        )}
      </div>

      {!compact && !isFree && (
        <p className="open-table-rake-hint">
          {t("openTables.rakeHint", { percent: rakePercent })}
          {evenMatch && (
            <>
              {" · "}
              <span className="open-table-even-label">
                {t("openTables.evenMatch")}
              </span>
            </>
          )}
        </p>
      )}


      <Button
        size="sm"
        variant={compact ? "outline" : "play"}
        className="open-table-join-btn"
        disabled={disabled}
        onClick={() => onJoin(lobby)}
      >
        {t("openTables.join")}
      </Button>
    </div>
  );
}

const MODE_FILTERS: Exclude<ModeFilter, "all">[] = [
  "casual",
  "custom",
  "ranked",
  "tournament",
];

export function OpenTablesPanel({
  lobbies,
  playerId,
  isGuest = false,
  myRating,
  myGamesPlayed = 0,
  hostProfiles = {},
  loading,
  onJoin,
  contextMode,
  contextBetSol = 0,
  tournamentQueue,
  layout = "sidebar",
}: OpenTablesPanelProps) {
  const { t } = useTranslation();
  const narrow = useNarrowLayout();
  const mobile = useMobileLayout();
  const compact = narrow || mobile;
  const useContextFilter = contextMode != null;
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const contextLobbies = useMemo(() => {
    if (!useContextFilter || !contextMode) return lobbies;
    return filterLobbiesByContext(lobbies, contextMode, contextBetSol);
  }, [lobbies, useContextFilter, contextMode, contextBetSol]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim();
    return sortByRatingProximity(
      contextLobbies.filter((lobby) => {
        if (playerId && lobby.player1 === playerId) return false;
        if (!useContextFilter && !matchesModeFilter(lobby, modeFilter)) {
          return false;
        }
        const host = hostProfiles[lobby.player1];
        return openTableMatchesSearch(lobby, host?.nickname, q);
      }),
      myRating,
    );
  }, [
    contextLobbies,
    useContextFilter,
    modeFilter,
    searchQuery,
    hostProfiles,
    myRating,
    playerId,
  ]);

  const list = filtered;
  const hasActiveFilters =
    (!useContextFilter && modeFilter !== "all") || searchQuery.trim().length > 0;

  const showTournamentQueue =
    useContextFilter &&
    contextMode &&
    isTournamentMode(contextMode) &&
    tournamentQueue != null;

  const panelBody = (
    <>
      <div
        className={cn(
          "open-tables-header",
          layout === "modal" && "open-tables-header-modal",
        )}
      >
        {!useContextFilter && (
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            <Users className="size-3.5 text-primary" />
            {t("openTables.title")}
          </div>
        )}

        {!useContextFilter && (
          <div
            className="open-tables-filters open-tables-mode-filters"
            role="tablist"
            aria-label={t("openTables.modeFilterLabel")}
          >
            {MODE_FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={modeFilter === key}
                className={cn(
                  "open-tables-filter-btn open-tables-filter-btn-mode",
                  modeFilter === key && "open-tables-filter-btn-active",
                  `open-tables-filter-btn-${key}`,
                )}
                onClick={() =>
                  setModeFilter((current) => (current === key ? "all" : key))
                }
              >
                {t(`openTables.modeFilters.${key}`)}
              </button>
            ))}
          </div>
        )}

        <div className="open-tables-search">
          <Search className="open-tables-search-icon size-3.5" aria-hidden />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("openTables.searchPlaceholder")}
            className="open-tables-search-input"
          />
        </div>

        {myRating != null && (
          <p className="open-tables-header-meta">
            {t("openTables.yourRating", { rating: myRating })}
            {" · "}
            {t("openTables.sortedByRating")}
          </p>
        )}
      </div>

      <div className="open-tables-body">
        {showTournamentQueue && (
          <div className="open-tables-tournament-queue">
            <p className="open-tables-tournament-queue-title">
              {t("openTables.tournamentQueueTitle")}
            </p>
            <p className="open-tables-tournament-queue-count">
              {t("tournament.waiting", {
                current: tournamentQueue.registered,
                total: tournamentQueue.needed,
              })}
            </p>
            <p className="open-tables-tournament-queue-hint">
              {t("openTables.tournamentQueueHint")}
            </p>
          </div>
        )}

        <div className="custom-scrollbar">
          <div className="space-y-2.5 pr-1">
            {list.length === 0 ? (
              <p className="open-tables-empty text-sm text-muted-foreground px-1 py-6 text-center">
                {hasActiveFilters
                  ? t("openTables.emptySearch")
                  : showTournamentQueue
                    ? t("openTables.emptyTournament")
                    : t("openTables.emptyPlain")}
              </p>
            ) : (
              <ul className="open-tables-list">
                {list.map((lobby) => (
                  <li key={lobby.id}>
                    <OpenTableCard
                      lobby={lobby}
                      hostProfile={hostProfiles[lobby.player1]}
                      myRating={myRating}
                      myGamesPlayed={myGamesPlayed}
                      playerId={playerId}
                      isGuest={isGuest}
                      loading={loading}
                      compact={compact}
                      onJoin={onJoin}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );

  if (layout === "modal") {
    return <div className="open-tables open-tables-modal-panel">{panelBody}</div>;
  }

  if (layout === "sheet") {
    return <div className="open-tables open-tables-sheet-panel">{panelBody}</div>;
  }

  return (
    <div className={cn("open-tables", compact && "open-tables-rail")}>
      <div className="open-tables-card">{panelBody}</div>
    </div>
  );
}

export function OpenTablesList(props: OpenTablesListProps) {
  return <OpenTablesPanel {...props} layout="sidebar" />;
}
