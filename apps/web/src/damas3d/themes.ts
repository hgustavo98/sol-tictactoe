import type { BoardTheme, PieceSetTheme } from "./types";

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "classic",
    nameKey: "customize.boards.classic",
    lightSquare: "#ffd4b8",
    darkSquare: "#8b2500",
    frame: "#5c1a0a",
    rim: "#3d1208",
    accent: "#ff6b35",
  },
  {
    id: "midnight",
    nameKey: "customize.boards.midnight",
    lightSquare: "#c45c26",
    darkSquare: "#2a1010",
    frame: "#1a0808",
    rim: "#120606",
    accent: "#ff6b35",
  },
  {
    id: "sunset",
    nameKey: "customize.boards.sunset",
    lightSquare: "#ffb347",
    darkSquare: "#e63946",
    frame: "#8b2500",
    rim: "#5c1a0a",
    accent: "#ff8c42",
  },
  {
    id: "neon",
    nameKey: "customize.boards.neon",
    lightSquare: "#ff8c69",
    darkSquare: "#3d1515",
    frame: "#2a1010",
    rim: "#1a0808",
    accent: "#ff4757",
  },
  {
    id: "marble",
    nameKey: "customize.boards.marble",
    lightSquare: "#fff0e6",
    darkSquare: "#a63d2a",
    frame: "#6b2818",
    rim: "#4a1a10",
    accent: "#ffb347",
  },
];

export const PIECE_SETS: PieceSetTheme[] = [
  {
    id: "classic",
    nameKey: "customize.pieces.classic",
    geometry: "classic",
    white: { color: "#ff6b35", metalness: 0.35, roughness: 0.45 },
    black: { color: "#2a1010", metalness: 0.4, roughness: 0.4 },
  },
  {
    id: "goldOnyx",
    nameKey: "customize.pieces.goldOnyx",
    geometry: "classic",
    white: { color: "#ffb347", metalness: 0.85, roughness: 0.25 },
    black: { color: "#1a0808", metalness: 0.7, roughness: 0.3 },
  },
  {
    id: "neon",
    nameKey: "customize.pieces.neon",
    geometry: "bold",
    white: {
      color: "#ffffff",
      metalness: 0.2,
      roughness: 0.15,
      emissive: "#ff6b35",
      emissiveIntensity: 0.45,
    },
    black: {
      color: "#ffffff",
      metalness: 0.2,
      roughness: 0.15,
      emissive: "#e63946",
      emissiveIntensity: 0.5,
    },
  },
  {
    id: "wood",
    nameKey: "customize.pieces.wood",
    geometry: "classic",
    white: { color: "#e8a87c", metalness: 0.05, roughness: 0.85 },
    black: { color: "#5c1a0a", metalness: 0.05, roughness: 0.9 },
  },
  {
    id: "crystal",
    nameKey: "customize.pieces.crystal",
    geometry: "minimal",
    white: { color: "#ffe4d6", metalness: 0.95, roughness: 0.08 },
    black: { color: "#8b2500", metalness: 0.9, roughness: 0.1 },
  },
];

export const DEFAULT_CUSTOMIZATION = {
  boardThemeId: "midnight",
  pieceSetId: "neon",
} as const;

export function getBoardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}

export function getPieceSet(id: string): PieceSetTheme {
  return PIECE_SETS.find((t) => t.id === id) ?? PIECE_SETS[0];
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function mixHex(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const t = Math.min(1, Math.max(0, amount));
  const r = Math.round(ar * (1 - t) + br * t);
  const g = Math.round(ag * (1 - t) + bg * t);
  const bl = Math.round(ab * (1 - t) + bb * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

export function resolvePieceSetTheme(
  pieceSet: PieceSetTheme,
  boardTheme: BoardTheme,
): PieceSetTheme {
  if (pieceSet.id !== "neon") return pieceSet;

  return {
    ...pieceSet,
    white: {
      ...pieceSet.white,
      color: mixHex(boardTheme.accent, "#ffffff", 0.72),
      emissive: boardTheme.accent,
      emissiveIntensity: 0.55,
    },
    black: {
      ...pieceSet.black,
      color: mixHex(boardTheme.lightSquare, "#1a0808", 0.45),
      emissive: boardTheme.lightSquare,
      emissiveIntensity: 0.5,
    },
  };
}
