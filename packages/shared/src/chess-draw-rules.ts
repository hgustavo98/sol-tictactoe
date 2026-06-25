export type ChessDrawKind =
  | "none"
  | "stalemate"
  | "insufficient_material"
  | "threefold_repetition"
  | "fifty_move";

/** Minimal checkers-engine surface used for draw classification. */
export interface ChessDrawInspector {
  isCheckmate(): boolean;
  isStalemate(): boolean;
  isInsufficientMaterial(): boolean;
  isThreefoldRepetition(): boolean;
  isDraw(): boolean;
  isGameOver(): boolean;
  isFiftyMoveRule?(): boolean;
}

export const DRAW_NOT_ALLOWED_ERROR = "draw_not_allowed";

export function classifyChessDraw(chess: ChessDrawInspector): ChessDrawKind {
  if (chess.isCheckmate() || !chess.isGameOver()) return "none";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isInsufficientMaterial()) return "insufficient_material";
  if (chess.isThreefoldRepetition()) return "threefold_repetition";
  if (typeof chess.isFiftyMoveRule === "function" && chess.isFiftyMoveRule()) {
    return "fifty_move";
  }
  if (chess.isDraw()) return "fifty_move";
  return "none";
}

/** Draws that cannot be avoided without breaking FIDE rules. */
export function isMandatoryChessDraw(kind: ChessDrawKind): boolean {
  return kind === "stalemate" || kind === "insufficient_material";
}

export function isAvoidableDraw(kind: ChessDrawKind): boolean {
  return kind === "threefold_repetition" || kind === "fifty_move";
}

/** Staked/tournament and all server-adjudicated games: no repetition / fifty-move draws. */
export function usesStrictDrawPolicy(_input?: {
  betLamports?: number;
  tournamentId?: string | null;
}): boolean {
  return true;
}

export function moveEndsInDisallowedDraw(
  chess: ChessDrawInspector,
  strictDrawPolicy: boolean,
): boolean {
  if (!strictDrawPolicy) return false;
  const kind = classifyChessDraw(chess);
  return isAvoidableDraw(kind);
}
