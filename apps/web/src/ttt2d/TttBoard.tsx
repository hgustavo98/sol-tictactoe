import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TictactoeEngine, type TttColor } from "@sol-tictactoe/shared";
import { TTT_THEME } from "./theme";

const CELLS = ["a3", "b3", "c3", "a2", "b2", "c2", "a1", "b1", "c1"] as const;

interface TttBoardProps {
  fen: string;
  myColor: TttColor | null;
  isMyTurn: boolean;
  onCellClick: (cell: string) => void;
  winningLine?: number[] | null;
  lastMove?: string | null;
}

function MarkIcon({ mark, size = 48 }: { mark: "x" | "o" | "."; size?: number }) {
  if (mark === ".") return null;
  const s = size;
  if (mark === "x") {
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden>
        <line x1="10" y1="10" x2="38" y2="38" stroke={TTT_THEME.xColor} strokeWidth="5" strokeLinecap="round" />
        <line x1="38" y1="10" x2="10" y2="38" stroke={TTT_THEME.xColor} strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="14" fill="none" stroke={TTT_THEME.oColor} strokeWidth="5" />
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
    <div className="ttt-board-wrap">
      <div className="ttt-board-grid" role="grid" aria-label="Tic Tac Toe">
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
                "ttt-cell",
                !empty && "ttt-cell-filled",
                canPlay && "ttt-cell-playable",
                isWin && "ttt-cell-win",
                isLast && "ttt-cell-last",
              )}
              onClick={() => canPlay && onCellClick(cell)}
              aria-label={empty ? `Play ${cell}` : cell}
            >
              {charMark !== "." && (
                <motion.div
                  initial={{ scale: 0, rotate: charMark === "x" ? -90 : 0 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
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
