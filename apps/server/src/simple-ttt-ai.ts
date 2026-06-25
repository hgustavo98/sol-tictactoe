import { TictactoeEngine, getLegalMoves } from "@sol-tictactoe/shared";

/** Simple minimax bot for tic tac toe training / casual bots. */
export function pickTttMove(fen: string, botColor: "w" | "b"): { from: string; to: string } | null {
  const engine = new TictactoeEngine(fen);
  if (engine.turn() !== botColor) return null;

  const legal = getLegalMoves(fen, botColor);
  if (legal.length === 0) return null;

  const opponent: "w" | "b" = botColor === "w" ? "b" : "w";

  // Win immediately
  for (const move of legal) {
    const trial = new TictactoeEngine(fen);
    trial.move(move);
    if (trial.winner() === botColor) return move;
  }

  // Block opponent win
  for (const move of legal) {
    const trial = new TictactoeEngine(fen);
    trial.move(move);
    if (trial.turn() === botColor) {
      for (const block of getLegalMoves(trial.fen(), opponent)) {
        const blockTrial = new TictactoeEngine(trial.fen());
        blockTrial.move(block);
        if (blockTrial.winner() === opponent) return move;
      }
    }
  }

  // Center, corners, sides
  const priority = ["b2", "a1", "a3", "c1", "c3", "a2", "b1", "b3", "c2"];
  for (const cell of priority) {
    const found = legal.find((m) => m.to === cell);
    if (found) return found;
  }

  return legal[0];
}
