import {
  computeBetBreakdown,
  computeDrawBreakdown,
  lamportsToSol,
  type GameEndReason,
  type GameOverResult,
} from "@sol-tictactoe/shared";

export type GameOutcome = "win" | "loss" | "draw";

export function resolveGameOutcome(
  playerId: string,
  result: GameOverResult,
): GameOutcome {
  const reason = normalizeReason(result.reason ?? result.state.endReason);
  if (reason === "draw" || reason === "stalemate" || !result.winner) {
    return "draw";
  }
  return result.winner === playerId ? "win" : "loss";
}

function normalizeReason(
  reason: GameEndReason | string | undefined,
): GameEndReason | string {
  return reason ?? "checkmate";
}

export function gameResultReasonKey(
  reason: GameEndReason | string | undefined,
  outcome: GameOutcome,
): string {
  const r = normalizeReason(reason);
  if (outcome === "draw") {
    return r === "stalemate"
      ? "gameResult.reason.stalemate"
      : "gameResult.reason.draw";
  }
  const side = outcome === "win" ? "Win" : "Loss";
  const known: GameEndReason[] = [
    "checkmate",
    "resign",
    "timeout",
    "disconnect",
  ];
  if (known.includes(r as GameEndReason)) {
    return `gameResult.reason.${r}${side}`;
  }
  return outcome === "win"
    ? "gameResult.reason.genericWin"
    : "gameResult.reason.genericLoss";
}

export function gameResultEconomics(result: GameOverResult) {
  const { betLamports, rakeBps } = result.state;
  const isFree = betLamports === 0;
  if (isFree) {
    return { isFree: true as const };
  }
  const isDraw =
    !result.winner ||
    result.reason === "stalemate" ||
    result.reason === "draw";
  const breakdown = isDraw
    ? computeDrawBreakdown(betLamports, rakeBps)
    : computeBetBreakdown(betLamports, rakeBps);
  const refundLamports = isDraw
    ? (breakdown as ReturnType<typeof computeDrawBreakdown>).refundLamports
    : Math.floor(breakdown.betLamports / 2);
  return {
    isFree: false as const,
    isDraw,
    breakdown,
    entrySol: lamportsToSol(breakdown.betLamports),
    prizeSol: lamportsToSol(breakdown.maxPayoutLamports),
    rakeSol: lamportsToSol(breakdown.rakeLamports),
    refundSol: lamportsToSol(refundLamports),
  };
}
