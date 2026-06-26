import {
  TictactoeEngine,
  getLegalMoves,
  type TttColor,
} from "@sol-tictactoe/shared";

/** Perfect-play minimax for 3×3 — instant and unbeatable. */
function terminalScore(fen: string, bot: TttColor, depth: number): number | null {
  const board = new TictactoeEngine(fen);
  const winner = board.winner();
  if (winner === bot) return 10 - depth;
  if (winner && winner !== bot) return depth - 10;
  if (board.isBoardFull()) return 0;
  return null;
}

function minimax(
  fen: string,
  bot: TttColor,
  maximizing: boolean,
  depth: number,
): number {
  const terminal = terminalScore(fen, bot, depth);
  if (terminal !== null) return terminal;

  const side = new TictactoeEngine(fen).turn();
  const legal = getLegalMoves(fen, side);
  if (legal.length === 0) return 0;

  if (maximizing) {
    let best = -Infinity;
    for (const move of legal) {
      const next = new TictactoeEngine(fen);
      next.move(move);
      best = Math.max(best, minimax(next.fen(), bot, false, depth + 1));
    }
    return best;
  }

  let best = Infinity;
  for (const move of legal) {
    const next = new TictactoeEngine(fen);
    next.move(move);
    best = Math.min(best, minimax(next.fen(), bot, true, depth + 1));
  }
  return best;
}

export function pickTrainingMove(
  fen: string,
  botColor: TttColor,
): { from: string; to: string } | null {
  const legal = getLegalMoves(fen, botColor);
  if (legal.length === 0) return null;
  if (legal.length === 1) return legal[0];

  let bestMove = legal[0];
  let bestScore = -Infinity;

  for (const move of legal) {
    const next = new TictactoeEngine(fen);
    next.move(move);
    const score = minimax(next.fen(), botColor, false, 1);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
