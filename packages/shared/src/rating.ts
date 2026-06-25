import type { TournamentSize } from "./tournament";

export const RANKED_STAKE_MULTIPLIER_MAX = 1;

export const TOURNAMENT_RATING_MULTIPLIER: Record<TournamentSize, number> = {
  4: 1,
  6: 1,
  8: 1,
  12: 1,
};

export function scaleRatingDelta(delta: number, multiplier: number): number {
  if (multiplier === 1) return delta;
  return Math.round(delta * multiplier);
}

export function rankedStakeMultiplier(_betLamports: number): number {
  return 1;
}

export function tournamentRatingMultiplier(_size: TournamentSize): number {
  return 1;
}

export function tournamentRatingMultiplierFromEntry(_entryLamports: number): number {
  return 1;
}
