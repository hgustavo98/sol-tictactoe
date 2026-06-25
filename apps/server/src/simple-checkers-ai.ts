import { CheckersEngine, getLegalMoves } from "@sol-tictactoe/shared";

/** Simple checkers bot — picks a random legal move. */
export function pickBotMove(fen: string, color: "w" | "b"): { from: string; to: string } | null {
  const moves = getLegalMoves(fen, color);
  if (moves.length === 0) return null;
  const pick = moves[Math.floor(Math.random() * moves.length)]!;
  return { from: pick.from, to: pick.to };
}

export function applyBotMove(fen: string, color: "w" | "b"): string | null {
  const move = pickBotMove(fen, color);
  if (!move) return null;
  const engine = new CheckersEngine(fen);
  engine.move(move);
  return engine.fen();
}
