/** Blue neon + purple — SOL Tic Tac Toe */
export const GAME_THEME = {
  bg: "#060912",
  bgPanel: "#0c1024",
  bgElevated: "#111833",
  blue: "#00b4ff",
  blueBright: "#33cfff",
  blueDim: "#0088cc",
  purple: "#7c3aed",
  purpleLight: "#a78bfa",
  purpleGlow: "#9333ea",
  xColor: "#33cfff",
  oColor: "#c084fc",
  gold: "#fbbf24",
  text: "#e8ecf4",
  muted: "#8892a8",
  border: "rgba(51, 207, 255, 0.22)",
  borderPurple: "rgba(167, 139, 250, 0.28)",
} as const;

export const MODE_ACCENT: Record<string, string> = {
  casual1v1: GAME_THEME.blue,
  custom1v1: GAME_THEME.gold,
  ranked1v1: GAME_THEME.purpleLight,
  rankedStake1v1: GAME_THEME.purple,
  tournament4: GAME_THEME.purple,
  tournament6: GAME_THEME.purpleLight,
  tournament8: GAME_THEME.purpleGlow,
  tournament12: GAME_THEME.gold,
};

/** @deprecated use GAME_THEME */
export const TTT_THEME = {
  bg: GAME_THEME.bg,
  bgCard: GAME_THEME.bgPanel,
  bgElevated: GAME_THEME.bgElevated,
  primary: GAME_THEME.blue,
  primaryDim: GAME_THEME.blueDim,
  accent: GAME_THEME.purple,
  accentHot: GAME_THEME.purpleGlow,
  gold: GAME_THEME.gold,
  xColor: GAME_THEME.xColor,
  oColor: GAME_THEME.oColor,
  gridLine: GAME_THEME.borderPurple,
  glow: "rgba(0, 180, 255, 0.2)",
};
