export type PieceKind = "m" | "k";
export type PieceColor = "w" | "b";
export type BoardOrientation = "white" | "black";

export interface BoardTheme {
  id: string;
  nameKey: string;
  lightSquare: string;
  darkSquare: string;
  frame: string;
  rim: string;
  accent: string;
}

export interface PieceMaterialTheme {
  color: string;
  metalness: number;
  roughness: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export interface PieceSetTheme {
  id: string;
  nameKey: string;
  geometry: "classic" | "minimal" | "bold";
  white: PieceMaterialTheme;
  black: PieceMaterialTheme;
}

export interface ChessCustomization {
  boardThemeId: string;
  pieceSetId: string;
}

export interface BoardSquare {
  file: number;
  rank: number;
  algebraic: string;
  isLight: boolean;
}

export interface PlacedPiece {
  square: string;
  kind: PieceKind;
  color: PieceColor;
}
