import { useTranslation } from "react-i18next";
import {
  displayPlayerName,
  type PlayerProfile,
  type TournamentBracketMatch,
  type TournamentState,
} from "@sol-tictactoe/shared";
import { cn } from "@/lib/utils";
import {
  bracketRounds,
  isTournamentEliminated,
  matchesInRound,
  playerInMatch,
  shortWallet,
} from "../../utils/tournamentPlayer";

interface TournamentBracketPanelProps {
  tournament: TournamentState;
  wallet?: string;
  activeMatchId?: string | null;
  profiles?: Record<string, PlayerProfile>;
  compact?: boolean;
}

function slotLabel(
  wallet: string | undefined,
  profiles: Record<string, PlayerProfile>,
  me?: string,
  t?: (key: string) => string,
): string {
  if (!wallet) return "—";
  if (wallet === me) return t?.("tournament.bracket.you") ?? "You";
  const p = profiles[wallet];
  if (p) return displayPlayerName(p, shortWallet(wallet));
  return shortWallet(wallet);
}

function matchStatusClass(
  m: TournamentBracketMatch,
  wallet?: string,
  activeMatchId?: string | null,
): string {
  if (activeMatchId && m.gameMatchId === activeMatchId) return "tournament-bracket-match-active";
  if (m.status === "completed") {
    if (wallet && playerInMatch(m, wallet) && m.winner === wallet) {
      return "tournament-bracket-match-won";
    }
    if (wallet && playerInMatch(m, wallet) && m.winner !== wallet) {
      return "tournament-bracket-match-lost";
    }
    return "tournament-bracket-match-done";
  }
  if (m.status === "playing" || m.status === "ready") return "tournament-bracket-match-live";
  return "tournament-bracket-match-pending";
}

export function TournamentBracketPanel({
  tournament,
  wallet,
  activeMatchId,
  profiles = {},
  compact = false,
}: TournamentBracketPanelProps) {
  const { t } = useTranslation();
  const rounds = bracketRounds(tournament);
  const eliminated = wallet ? isTournamentEliminated(tournament, wallet) : false;

  return (
    <div className={cn("tournament-bracket-panel", compact && "tournament-bracket-panel-compact")}>
      <div className="tournament-bracket-header">
        <h3 className="tournament-bracket-title">{t("tournament.bracket.title")}</h3>
        <span className="tournament-bracket-size">
          {t("tournament.bracket.size", { count: tournament.size })}
        </span>
      </div>

      <div className="tournament-bracket-rounds custom-scrollbar">
        {rounds.map((round) => (
          <div key={round} className="tournament-bracket-round">
            <span className="tournament-bracket-round-label">
              {t("tournament.bracket.round", { round })}
            </span>
            <div className="tournament-bracket-matches">
              {matchesInRound(tournament, round).map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "tournament-bracket-match",
                    matchStatusClass(m, wallet, activeMatchId),
                  )}
                >
                  <div className="tournament-bracket-slot">
                    <span
                      className={cn(
                        m.winner === m.playerA && "tournament-bracket-winner",
                        m.playerA === wallet && "tournament-bracket-you",
                      )}
                    >
                      {slotLabel(m.playerA, profiles, wallet, t)}
                    </span>
                  </div>
                  <span className="tournament-bracket-vs">vs</span>
                  <div className="tournament-bracket-slot">
                    <span
                      className={cn(
                        m.winner === m.playerB && "tournament-bracket-winner",
                        m.playerB === wallet && "tournament-bracket-you",
                      )}
                    >
                      {m.status === "bye"
                        ? t("tournament.bracket.bye")
                        : slotLabel(m.playerB, profiles, wallet, t)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {wallet && eliminated && (
        <p className="tournament-bracket-eliminated">{t("tournament.bracket.eliminated")}</p>
      )}
      {wallet && tournament.winner === wallet && (
        <p className="tournament-bracket-champion">{t("tournament.bracket.champion")}</p>
      )}
    </div>
  );
}
