import { TictactoeEngine, getLegalMoves } from "@sol-tictactoe/shared";

export function pickTrainingMove(fen: string, color: "w" | "b"): { from: string; to: string } | null {
  const moves = getLegalMoves(fen, color);
  if (moves.length === 0) return null;
  const pick = moves[Math.floor(Math.random() * moves.length)]!;
  return { from: pick.from, to: pick.to };
}

export function createTrainingEngine(): TictactoeEngine {
  return new TictactoeEngine();
}
