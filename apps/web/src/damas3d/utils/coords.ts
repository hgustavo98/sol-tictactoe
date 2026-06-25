import type { BoardSquare, PlacedPiece, PieceColor, PieceKind } from "../types";

export const BOARD_SIZE = 8;
export const SQUARE_SIZE = 1;

export function fileRankToAlgebraic(file: number, rank: number): string {
  return `${String.fromCharCode(97 + file)}${rank + 1}`;
}

export function algebraicToFileRank(square: string): { file: number; rank: number } {
  return {
    file: square.charCodeAt(0) - 97,
    rank: parseInt(square[1], 10) - 1,
  };
}

export function squareToWorld(square: string): [number, number, number] {
  const { file, rank } = algebraicToFileRank(square);
  const x = (file - 3.5) * SQUARE_SIZE;
  const z = (rank - 3.5) * SQUARE_SIZE;
  return [x, 0, z];
}

export function buildSquares(): BoardSquare[] {
  const squares: BoardSquare[] = [];
  for (let rank = 0; rank < BOARD_SIZE; rank++) {
    for (let file = 0; file < BOARD_SIZE; file++) {
      squares.push({
        file,
        rank,
        algebraic: fileRankToAlgebraic(file, rank),
        isLight: (file + rank) % 2 === 0,
      });
    }
  }
  return squares;
}

/** Parse checkers FEN board (8-char rows, r/R/b/B/.). */
export function parseCheckersFen(fen: string): PlacedPiece[] {
  const boardPart = fen.split(/\s+/)[0];
  const rows = boardPart.split("/");
  const pieces: PlacedPiece[] = [];

  for (let rankIndex = 0; rankIndex < rows.length; rankIndex++) {
    const row = rows[rankIndex] ?? "........";
    for (let file = 0; file < BOARD_SIZE; file++) {
      const ch = row[file] ?? ".";
      if (ch === ".") continue;
      const color: PieceColor = ch === "r" || ch === "R" ? "w" : "b";
      const kind: PieceKind = ch === "R" || ch === "B" ? "k" : "m";
      pieces.push({
        square: fileRankToAlgebraic(file, 7 - rankIndex),
        kind,
        color,
      });
    }
  }

  return pieces;
}

/** @deprecated chess FEN — use parseCheckersFen */
export function parseFenPieces(fen: string): PlacedPiece[] {
  return parseCheckersFen(fen);
}
