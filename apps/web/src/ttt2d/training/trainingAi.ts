import { TictactoeEngine, getLegalMoves } from "@sol-tictactoe/shared";

export function pickTrainingMove(fen: string, botColor: "w" | "b"): { from: string; to: string } | null {
  const engine = new TictactoeEngine(fen);
  if (engine.turn() !== botColor) return null;

  const legal = getLegalMoves(fen, botColor);
  if (legal.length === 0) return null;

  const opponent: "w" | "b" = botColor === "w" ? "b" : "w";

  for (const move of legal) {
    const trial = new TictactoeEngine(fen);
    trial.move(move);
    if (trial.winner() === botColor) return move;
  }

  for (const move of legal) {
    const trial = new TictactoeEngine(fen);
    trial.move(move);
    for (const opp of getLegalMoves(trial.fen(), opponent)) {
      const block = new TictactoeEngine(trial.fen());
      block.move(opp);
      if (block.winner() === opponent) return move;
    }
  }

  const priority = ["b2", "a1", "a3", "c1", "c3", "a2", "b1", "b3", "c2"];
  for (const cell of priority) {
    const found = legal.find((m) => m.to === cell);
    if (found) return found;
  }

  return legal[0];
}
