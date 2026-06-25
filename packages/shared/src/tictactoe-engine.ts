/** Tic Tac Toe 3×3 — shared between server and web client. */

export type TttColor = "w" | "b";

export interface TttMovePayload {
  from: string;
  to: string;
}

export interface TttMoveVerbose extends TttMovePayload {
  captured?: string[];
}

const SIZE = 3;
export const INITIAL_TTT_FEN = "......../w";

function posToCell(row: number, col: number): string {
  return `${String.fromCharCode(97 + col)}${SIZE - row}`;
}

function cellToPos(cell: string): { row: number; col: number } {
  const col = cell.charCodeAt(0) - 97;
  const row = SIZE - parseInt(cell[1], 10);
  return { row, col };
}

type Mark = "." | "x" | "o";

function parseBoardPart(fen: string): Mark[] {
  const part = fen.trim().split(/\s+/)[0];
  const cells: Mark[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    const ch = part[i] ?? ".";
    if (ch === "x" || ch === "o") cells.push(ch);
    else cells.push(".");
  }
  return cells;
}

function boardToFenPart(cells: Mark[]): string {
  return cells.join("");
}

function parseFen(fen?: string): { cells: Mark[]; turn: TttColor } {
  const raw = fen?.trim() || INITIAL_TTT_FEN;
  const parts = raw.split(/\s+/);
  return {
    cells: parseBoardPart(parts[0]),
    turn: parts[1] === "b" ? "b" : "w",
  };
}

function markForColor(color: TttColor): Mark {
  return color === "w" ? "x" : "o";
}

function colorForMark(mark: Mark): TttColor | null {
  if (mark === "x") return "w";
  if (mark === "o") return "b";
  return null;
}

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(cells: Mark[]): TttColor | null {
  for (const [a, b, c] of WIN_LINES) {
    const m = cells[a];
    if (m !== "." && m === cells[b] && m === cells[c]) {
      return colorForMark(m);
    }
  }
  return null;
}

function emptyCells(cells: Mark[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === ".") {
      const row = Math.floor(i / SIZE);
      const col = i % SIZE;
      out.push(posToCell(row, col));
    }
  }
  return out;
}

export function getLegalMoves(fen: string, color?: TttColor): TttMoveVerbose[] {
  const { cells, turn } = parseFen(fen);
  const side = color ?? turn;
  if (checkWinner(cells)) return [];
  return emptyCells(cells).map((cell) => ({ from: cell, to: cell }));
}

export class TictactoeEngine {
  private cells: Mark[];
  private sideToMove: TttColor;
  private moveHistory: string[] = [];

  constructor(fen?: string) {
    const parsed = parseFen(fen);
    this.cells = [...parsed.cells];
    this.sideToMove = parsed.turn;
  }

  fen(): string {
    return `${boardToFenPart(this.cells)} ${this.sideToMove}`;
  }

  turnColor(): TttColor {
    return this.sideToMove;
  }

  turn(): TttColor {
    return this.sideToMove;
  }

  history(): string[] {
    return [...this.moveHistory];
  }

  pgn(): string {
    return this.moveHistory.join(" ");
  }

  legalMoves(from?: string): TttMoveVerbose[] {
    if (from) {
      return getLegalMoves(this.fen()).filter((m) => m.to === from);
    }
    return getLegalMoves(this.fen());
  }

  move(payload: TttMovePayload): TttMoveVerbose {
    const cell = payload.to || payload.from;
    const legal = this.legalMoves();
    const match = legal.find((m) => m.to === cell);
    if (!match) throw new Error("Invalid move");

    const { row, col } = cellToPos(cell);
    const idx = row * SIZE + col;
    this.cells[idx] = markForColor(this.sideToMove);
    this.moveHistory.push(cell);

    const winner = checkWinner(this.cells);
    if (!winner) {
      this.sideToMove = this.sideToMove === "w" ? "b" : "w";
    }
    return match;
  }

  winner(): TttColor | null {
    return checkWinner(this.cells);
  }

  isBoardFull(): boolean {
    return this.cells.every((c) => c !== ".");
  }

  hasLegalMoves(color: TttColor = this.sideToMove): boolean {
    return getLegalMoves(this.fen(), color).length > 0;
  }

  isGameOver(): boolean {
    return this.winner() !== null || this.isBoardFull();
  }

  isCheckmate(): boolean {
    return this.winner() !== null;
  }

  isStalemate(): boolean {
    return false;
  }

  isInsufficientMaterial(): boolean {
    return false;
  }

  isDraw(): boolean {
    return !this.winner() && this.isBoardFull();
  }

  drawKind(): "insufficient_material" | null {
    return this.isDraw() ? "insufficient_material" : null;
  }

  /** Cell marks for UI: x = white, o = black, . = empty */
  boardMarks(): Mark[] {
    return [...this.cells];
  }

  cellAt(cell: string): Mark {
    const { row, col } = cellToPos(cell);
    return this.cells[row * SIZE + col];
  }

  /** Legacy checkers API — used by unused 3D modules still in tree */
  pieceAt(square: string): { color: TttColor; king: boolean } | null {
    const mark = this.cellAt(square);
    if (mark === "x") return { color: "w", king: false };
    if (mark === "o") return { color: "b", king: false };
    return null;
  }
}

export function simulateMove(
  fen: string,
  payload: TttMovePayload,
): { ok: true; engine: TictactoeEngine } | { ok: false } {
  const engine = new TictactoeEngine(fen);
  try {
    engine.move(payload);
    return { ok: true, engine };
  } catch {
    return { ok: false };
  }
}

export function colorForWallet(
  wallet: string,
  playerWhite: string,
  playerBlack: string,
): TttColor | null {
  if (wallet === playerWhite) return "w";
  if (wallet === playerBlack) return "b";
  return null;
}

/** Backward-compatible aliases used by match-manager imports */
export type CheckersColor = TttColor;
export type CheckersMovePayload = TttMovePayload;
export type CheckersMoveVerbose = TttMoveVerbose;
export type CheckersEngineType = TictactoeEngine;
export const CheckersEngine = TictactoeEngine;
export const INITIAL_CHECKERS_FEN = INITIAL_TTT_FEN;
