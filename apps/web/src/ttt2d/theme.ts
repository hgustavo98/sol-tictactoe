/** Neon purple / cyan palette — distinct from checkers & chess */
export const TTT_THEME = {
  bg: "#0d0221",
  bgCard: "#150734",
  bgElevated: "#1a0a3e",
  primary: "#00f5d4",
  primaryDim: "#00c4aa",
  accent: "#9b5de5",
  accentHot: "#f15bb5",
  gold: "#fee440",
  xColor: "#00f5d4",
  oColor: "#f15bb5",
  gridLine: "rgba(155, 93, 229, 0.35)",
  glow: "rgba(0, 245, 212, 0.25)",
} as const;

export const MODE_ACCENT: Record<string, string> = {
  casual1v1: TTT_THEME.primary,
  custom1v1: TTT_THEME.gold,
  ranked1v1: TTT_THEME.accent,
  rankedStake1v1: TTT_THEME.accentHot,
  tournament4: TTT_THEME.accent,
  tournament6: TTT_THEME.accent,
  tournament8: TTT_THEME.accentHot,
  tournament12: TTT_THEME.gold,
};
