/** Paleta Tactoe — neon azul + roxo (Slotana-inspired). */
export const XTT = {
  bg: "#050a14",
  card: "#0c1024",
  purple: "#7c3aed",
  purpleDeep: "#5b21b6",
  purpleLight: "#c084fc",
  cyan: "#00b4ff",
  cyanBright: "#38bdf8",
  gold: "#fbbf24",
} as const;

/** Accent por modo — alinhado ao lobby central (cyan casual, roxo custom). */
export const XTT_MODE_ACCENT: Record<string, string> = {
  casual1v1: XTT.cyan,
  custom1v1: XTT.purple,
  rankedPresets1v1: XTT.purpleLight,
  rankedStake1v1: XTT.purple,
  ranked1v1: XTT.purple,
  tournament4: XTT.cyanBright,
  tournament6: XTT.purple,
  tournament8: XTT.purpleLight,
  tournament12: XTT.gold,
};
