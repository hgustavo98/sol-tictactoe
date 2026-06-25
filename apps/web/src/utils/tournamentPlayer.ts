import type { TournamentBracketMatch, TournamentState } from "@sol-tictactoe/shared";

export function playerInMatch(m: TournamentBracketMatch, wallet: string): boolean {
  return m.playerA === wallet || m.playerB === wallet;
}

export function isTournamentEliminated(
  tournament: TournamentState,
  wallet: string,
): boolean {
  return tournament.bracket.some(
    (m) =>
      m.status === "completed" &&
      playerInMatch(m, wallet) &&
      m.winner !== wallet,
  );
}

export function isTournamentChampion(
  tournament: TournamentState,
  wallet: string,
): boolean {
  return tournament.winner === wallet;
}

export function getPlayerBracketMatch(
  tournament: TournamentState,
  wallet: string,
  activeMatchId?: string | null,
): TournamentBracketMatch | undefined {
  if (activeMatchId) {
    const byGame = tournament.bracket.find((m) => m.gameMatchId === activeMatchId);
    if (byGame) return byGame;
  }
  return tournament.bracket.find(
    (m) =>
      playerInMatch(m, wallet) &&
      (m.status === "playing" || m.status === "ready"),
  );
}

export function isWaitingForNextRound(
  tournament: TournamentState,
  wallet: string,
): boolean {
  if (tournament.status !== "active") return false;
  if (isTournamentEliminated(tournament, wallet)) return false;

  const live = tournament.bracket.find(
    (m) =>
      playerInMatch(m, wallet) &&
      (m.status === "ready" || m.status === "playing"),
  );
  if (live) return false;

  const completed = tournament.bracket
    .filter((m) => m.status === "completed" && playerInMatch(m, wallet))
    .sort((a, b) => b.round - a.round);
  if (completed.length === 0) return false;

  const last = completed[0]!;
  if (last.winner !== wallet) return false;

  const maxRound = Math.max(...tournament.bracket.map((m) => m.round));
  return last.round < maxRound;
}

export function bracketRounds(tournament: TournamentState): number[] {
  return [...new Set(tournament.bracket.map((m) => m.round))].sort(
    (a, b) => a - b,
  );
}

export function matchesInRound(
  tournament: TournamentState,
  round: number,
): TournamentBracketMatch[] {
  return tournament.bracket
    .filter((m) => m.round === round)
    .sort((a, b) => a.roundIndex - b.roundIndex);
}

export function shortWallet(wallet?: string): string {
  if (!wallet) return "—";
  return wallet.length > 10 ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : wallet;
}
