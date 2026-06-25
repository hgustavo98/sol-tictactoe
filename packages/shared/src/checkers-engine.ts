/** Brazilian checkers (8×8) — shared between server and web client. */

export type CheckersColor = "w" | "b";

export interface CheckersMovePayload {
  from: string;
  to: string;
}

export interface CheckersMoveVerbose extends CheckersMovePayload {
  captured?: string[];
  promotes?: boolean;
}

const ROWS = 8;
const COLS = 8;

export const INITIAL_CHECKERS_FEN =
  ".b.b.b.b/b.b.b.b./.b.b.b.b./......./......./r.r.r.r./.r.r.r.r./r.r.r.r. w";

function isDark(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

export function algebraicToPos(sq: string): { row: number; col: number } {
  const col = sq.charCodeAt(0) - 97;
  const row = ROWS - parseInt(sq[1], 10);
  return { row, col };
}

export function posToAlgebraic(row: number, col: number): string {
  return `${String.fromCharCode(97 + col)}${ROWS - row}`;
}

type Cell = 0 | 1 | 2 | -1 | -2;

function cellColor(cell: Cell): CheckersColor | null {
  if (cell > 0) return "w";
  if (cell < 0) return "b";
  return null;
}

function isKing(cell: Cell): boolean {
  return cell === 2 || cell === -2;
}

function forwardDir(color: CheckersColor): number {
  return color === "w" ? -1 : 1;
}

function parseBoardPart(fen: string): Cell[][] {
  const rows = fen.trim().split(/\s+/)[0].split("/");
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(0),
  );
  for (let r = 0; r < ROWS; r++) {
    const line = rows[r] ?? "........";
    for (let c = 0; c < COLS; c++) {
      const ch = line[c] ?? ".";
      if (ch === ".") board[r][c] = 0;
      else if (ch === "r") board[r][c] = 1;
      else if (ch === "R") board[r][c] = 2;
      else if (ch === "b") board[r][c] = -1;
      else if (ch === "B") board[r][c] = -2;
    }
  }
  return board;
}

function boardToFenPart(board: Cell[][]): string {
  return board.map((row) => row.map((c) => cellToChar(c)).join("")).join("/");
}

function cellToChar(cell: Cell): string {
  if (cell === 0) return ".";
  if (cell === 1) return "r";
  if (cell === 2) return "R";
  if (cell === -1) return "b";
  return "B";
}

function parseFen(fen?: string): { board: Cell[][]; turn: CheckersColor } {
  const raw = fen?.trim() || INITIAL_CHECKERS_FEN;
  const parts = raw.split(/\s+/);
  const board = parseBoardPart(parts[0]);
  const turn: CheckersColor = parts[1] === "b" ? "b" : "w";
  return { board, turn };
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => [...row]);
}

function countPieces(board: Cell[][], color: CheckersColor): number {
  let n = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cellColor(cell) === color) n++;
    }
  }
  return n;
}

function applyPromotion(board: Cell[][], row: number, col: number): void {
  const cell = board[row][col];
  if (cell === 1 && row === 0) board[row][col] = 2;
  if (cell === -1 && row === ROWS - 1) board[row][col] = -2;
}

function scanCapturesFrom(
  board: Cell[][],
  row: number,
  col: number,
  color: CheckersColor,
  acc: CheckersMoveVerbose[],
  path: CheckersMovePayload[],
  captured: string[],
): void {
  const cell = board[row][col];
  if (!cell || cellColor(cell) !== color) return;

  const dirs = isKing(cell)
    ? [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
    : [[forwardDir(color), -1], [forwardDir(color), 1]];

  let found = false;
  for (const [dr, dc] of dirs) {
    const mr = row + dr;
    const mc = col + dc;
    const lr = row + dr * 2;
    const lc = col + dc * 2;
    if (!inBounds(lr, lc) || !isDark(lr, lc)) continue;
    if (!inBounds(mr, mc)) continue;
    const mid = board[mr][mc];
    if (!mid || cellColor(mid) === color) continue;
    if (board[lr][lc] !== 0) continue;

    found = true;
    const nextBoard = cloneBoard(board);
    nextBoard[row][col] = 0;
    nextBoard[mr][mc] = 0;
    nextBoard[lr][lc] = cell;
    applyPromotion(nextBoard, lr, lc);

    const capSq = posToAlgebraic(mr, mc);
    const move: CheckersMovePayload = {
      from: posToAlgebraic(row, col),
      to: posToAlgebraic(lr, lc),
    };
    const nextPath = [...path, move];
    const nextCaptured = [...captured, capSq];

    const further: CheckersMoveVerbose[] = [];
    scanCapturesFrom(
      nextBoard,
      lr,
      lc,
      color,
      further,
      nextPath,
      nextCaptured,
    );
    if (further.length === 0) {
      acc.push({
        from: nextPath[0].from,
        to: nextPath[nextPath.length - 1].to,
        captured: nextCaptured,
        promotes: nextBoard[lr][lc] !== cell,
      });
    } else {
      acc.push(...further);
    }
  }

  if (!found && path.length > 0) {
    acc.push({
      from: path[0].from,
      to: path[path.length - 1].to,
      captured,
    });
  }
}

function getCapturesForSquare(
  board: Cell[][],
  row: number,
  col: number,
  color: CheckersColor,
): CheckersMoveVerbose[] {
  const acc: CheckersMoveVerbose[] = [];
  scanCapturesFrom(board, row, col, color, acc, [], []);
  return acc;
}

function getAllCaptures(
  board: Cell[][],
  color: CheckersColor,
  onlyFrom?: { row: number; col: number },
): CheckersMoveVerbose[] {
  const moves: CheckersMoveVerbose[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (onlyFrom && (onlyFrom.row !== r || onlyFrom.col !== c)) continue;
      const cell = board[r][c];
      if (cellColor(cell) !== color) continue;
      moves.push(...getCapturesForSquare(board, r, c, color));
    }
  }
  return moves;
}

function getQuietMoves(
  board: Cell[][],
  row: number,
  col: number,
  color: CheckersColor,
): CheckersMoveVerbose[] {
  const cell = board[row][col];
  if (!cell || cellColor(cell) !== color) return [];

  const moves: CheckersMoveVerbose[] = [];
  const dirs = isKing(cell)
    ? [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
    : [[forwardDir(color), -1], [forwardDir(color), 1]];

  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inBounds(nr, nc) || !isDark(nr, nc)) continue;
    if (board[nr][nc] !== 0) continue;
    moves.push({ from: posToAlgebraic(row, col), to: posToAlgebraic(nr, nc) });
  }
  return moves;
}

function getAllQuietMoves(
  board: Cell[][],
  color: CheckersColor,
  onlyFrom?: { row: number; col: number },
): CheckersMoveVerbose[] {
  const moves: CheckersMoveVerbose[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (onlyFrom && (onlyFrom.row !== r || onlyFrom.col !== c)) continue;
      if (cellColor(board[r][c]) !== color) continue;
      moves.push(...getQuietMoves(board, r, c, color));
    }
  }
  return moves;
}

export function getLegalMoves(
  fen: string,
  color?: CheckersColor,
  fromSquare?: string,
): CheckersMoveVerbose[] {
  const { board, turn } = parseFen(fen);
  const active = color ?? turn;
  const onlyFrom = fromSquare ? algebraicToPos(fromSquare) : undefined;
  const captures = getAllCaptures(board, active, onlyFrom);
  if (captures.length > 0) return captures;
  return getAllQuietMoves(board, active, onlyFrom);
}

export class CheckersEngine {
  private board: Cell[][];
  private sideToMove: CheckersColor;
  private moveHistory: string[] = [];
  private continueFrom: { row: number; col: number } | null = null;

  constructor(fen?: string) {
    const parsed = parseFen(fen);
    this.board = parsed.board;
    this.sideToMove = parsed.turn;
  }

  fen(): string {
    return `${boardToFenPart(this.board)} ${this.sideToMove}`;
  }

  turnColor(): CheckersColor {
    return this.sideToMove;
  }

  /** Alias for match-manager compatibility (w = red, b = black). */
  turn(): CheckersColor {
    return this.sideToMove;
  }

  history(): string[] {
    return [...this.moveHistory];
  }

  pgn(): string {
    return this.moveHistory.join(" ");
  }

  legalMoves(from?: string): CheckersMoveVerbose[] {
    const onlyFrom =
      this.continueFrom ??
      (from ? algebraicToPos(from) : undefined);
    const captures = getAllCaptures(this.board, this.sideToMove, onlyFrom ?? undefined);
    if (captures.length > 0) return captures;
    if (this.continueFrom) return [];
    return getAllQuietMoves(
      this.board,
      this.sideToMove,
      onlyFrom ?? undefined,
    );
  }

  move(payload: CheckersMovePayload): CheckersMoveVerbose {
    const legal = this.legalMoves(payload.from);
    const match = legal.find(
      (m) => m.from === payload.from && m.to === payload.to,
    );
    if (!match) throw new Error("Invalid move");

    const { row: fr, col: fc } = algebraicToPos(payload.from);
    const { row: tr, col: tc } = algebraicToPos(payload.to);
    const piece = this.board[fr][fc];
    this.board[fr][fc] = 0;
    this.board[tr][tc] = piece;
    applyPromotion(this.board, tr, tc);

    if (match.captured) {
      for (const cap of match.captured) {
        const { row, col } = algebraicToPos(cap);
        this.board[row][col] = 0;
      }
    }

    const notation = `${payload.from}-${payload.to}`;
    this.moveHistory.push(notation);

    const further = getCapturesForSquare(this.board, tr, tc, this.sideToMove);
    if (match.captured && further.length > 0) {
      this.continueFrom = { row: tr, col: tc };
      return match;
    }

    this.continueFrom = null;
    this.sideToMove = this.sideToMove === "w" ? "b" : "w";
    return match;
  }

  pieceAt(square: string): { color: CheckersColor; king: boolean } | null {
    const { row, col } = algebraicToPos(square);
    const cell = this.board[row][col];
    const color = cellColor(cell);
    if (!color) return null;
    return { color, king: isKing(cell) };
  }

  countFor(color: CheckersColor): number {
    return countPieces(this.board, color);
  }

  hasLegalMoves(color: CheckersColor = this.sideToMove): boolean {
    return getLegalMoves(this.fen(), color).length > 0;
  }

  isGameOver(): boolean {
    if (this.countFor("w") === 0 || this.countFor("b") === 0) return true;
    return !this.hasLegalMoves(this.sideToMove);
  }

  /** Side to move has no legal moves — they lose. */
  isCheckmate(): boolean {
    if (this.countFor("w") === 0 || this.countFor("b") === 0) {
      return true;
    }
    return !this.hasLegalMoves(this.sideToMove);
  }

  isStalemate(): boolean {
    return false;
  }

  isInsufficientMaterial(): boolean {
    return this.countFor("w") <= 1 && this.countFor("b") <= 1;
  }

  isDraw(): boolean {
    return this.isInsufficientMaterial() && !this.isCheckmate();
  }

  drawKind(): "insufficient_material" | null {
    return this.isDraw() ? "insufficient_material" : null;
  }
}

export function simulateMove(
  fen: string,
  payload: CheckersMovePayload,
): { ok: true; engine: CheckersEngine } | { ok: false } {
  const engine = new CheckersEngine(fen);
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
): CheckersColor | null {
  if (wallet === playerWhite) return "w";
  if (wallet === playerBlack) return "b";
  return null;
}
