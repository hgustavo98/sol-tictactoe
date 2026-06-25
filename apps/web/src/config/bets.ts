import {
  computeBetBreakdown,
  CUSTOM_MAX_BET_SOL,
  CUSTOM_MIN_BET_SOL,
  CUSTOM_RAKE_BPS,
  MIN_BET_LAMPORTS,
  MIN_BET_SOL,
  oneVOnePrizeSol,
  solToLamports,
  RANKED_MIN_BET_SOL,
  RANKED_MAX_BET_SOL,
} from "@sol-tictactoe/shared";

export {
  MIN_BET_SOL,
  MIN_BET_LAMPORTS,
  CUSTOM_MIN_BET_SOL,
  CUSTOM_MAX_BET_SOL,
  RANKED_BET_SOL,
  RANKED_MIN_BET_SOL,
  RANKED_MAX_BET_SOL,
  RANKED_BET_PRESETS_SOL,
} from "@sol-tictactoe/shared";

/** @deprecated Removed — use GAME_MODES in gameModes.ts */
export const BET_ARENAS: {
  id: string;
  name: string;
  subtitle: string;
  betSol: number;
}[] = [];

export const MAX_BET_SOL = CUSTOM_MAX_BET_SOL;

export function clampBetSol(value: number): number {
  if (Number.isNaN(value) || value < CUSTOM_MIN_BET_SOL) return CUSTOM_MIN_BET_SOL;
  if (value > CUSTOM_MAX_BET_SOL) return CUSTOM_MAX_BET_SOL;
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

export type BetErrorKey = "invalid" | "min" | "max";

export function validateBetSol(value: number): BetErrorKey | null {
  if (Number.isNaN(value)) return "invalid";
  if (value < CUSTOM_MIN_BET_SOL) return "min";
  if (value > CUSTOM_MAX_BET_SOL) return "max";
  return null;
}

export function clampRankedBetSol(value: number): number {
  if (Number.isNaN(value) || value < RANKED_MIN_BET_SOL) return RANKED_MIN_BET_SOL;
  if (value > RANKED_MAX_BET_SOL) return RANKED_MAX_BET_SOL;
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

export function validateRankedBetSol(value: number): BetErrorKey | null {
  if (Number.isNaN(value)) return "invalid";
  if (value < RANKED_MIN_BET_SOL) return "min";
  if (value > RANKED_MAX_BET_SOL) return "max";
  return null;
}

export function formatSolAmount(sol: number): string {
  if (sol < 0.01) return sol.toFixed(4);
  if (sol < 1) return sol.toFixed(3);
  return sol.toFixed(2);
}

export function arenaPrizeSol(betSol: number, rakeBps = CUSTOM_RAKE_BPS): number {
  return oneVOnePrizeSol(betSol, rakeBps);
}

export function lobbiesForBet(
  lobbies: { betLamports: number; ranked?: boolean; tournamentId?: string }[],
  betSol: number,
): number {
  const target = solToLamports(betSol);
  return lobbies.filter(
    (l) =>
      l.betLamports === target &&
      !l.ranked &&
      !l.tournamentId,
  ).length;
}
