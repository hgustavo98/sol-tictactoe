import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TictactoeEngine } from "@sol-tictactoe/shared";
import { GAME_THEME } from "./theme";

const CELLS = ["a3", "b3", "c3", "a2", "b2", "c2", "a1", "b1", "c1"] as const;

interface TttBoardProps {
  fen: string;
  myColor: "w" | "b" | null;
  isMyTurn: boolean;
  onCellClick: (cell: string) => void;
  winningLine?: number[] | null;
  lastMove?: string | null;
}

function MarkIcon({ mark, size = 28 }: { mark: "x" | "o" | "."; size?: number }) {
  if (mark === ".") return null;
  const s = size;
  if (mark === "x") {
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden>
        <line x1="12" y1="12" x2="36" y2="36" stroke={GAME_THEME.xColor} strokeWidth="4" strokeLinecap="round" />
        <line x1="36" y1="12" x2="12" y2="36" stroke={GAME_THEME.xColor} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="13" fill="none" stroke={GAME_THEME.oColor} strokeWidth="4" />
    </svg>
  );
}

export function TttBoard({
  fen,
  myColor,
  isMyTurn,
  onCellClick,
  winningLine,
  lastMove,
}: TttBoardProps) {
  const engine = new TictactoeEngine(fen);
  const marks = engine.boardMarks();

  return (
    <div className="xtt-board-wrap">
      <div className="xtt-board-grid" role="grid" aria-label="Tic Tac Toe">
        {CELLS.map((cell, idx) => {
          const mark = marks[idx];
          const charMark = mark === "x" ? "x" : mark === "o" ? "o" : ".";
          const empty = charMark === ".";
          const canPlay = empty && isMyTurn && myColor !== null;
          const isWin = winningLine?.includes(idx);
          const isLast = lastMove === cell;

          return (
            <button
              key={cell}
              type="button"
              role="gridcell"
              disabled={!canPlay}
              className={cn(
                "xtt-cell",
                canPlay && "xtt-cell-playable",
                isWin && "xtt-cell-win",
                isLast && "xtt-cell-last",
              )}
              onClick={() => canPlay && onCellClick(cell)}
              aria-label={empty ? `Play ${cell}` : cell}
            >
              {charMark !== "." && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                >
                  <MarkIcon mark={charMark} />
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function getWinningLine(fen: string): number[] | null {
  const engine = new TictactoeEngine(fen);
  const marks = engine.boardMarks();
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const line of lines) {
    const [a, b, c] = line;
    if (marks[a] !== "." && marks[a] === marks[b] && marks[a] === marks[c]) {
      return line;
    }
  }
  return null;
}
