/** Paleta SOL TTT — vermelho profundo + laranja vibrante */
export const DOPAMINE = {
  bg: "#120606",
  navy: "#1a0808",
  navyMid: "#2a1010",
  navyLight: "#3d1515",
  cyan: "#ff6b35",
  sky: "#ff8c42",
  electric: "#e63946",
  ice: "#ffb347",
  green: "#ff6b35",
  greenGlow: "#ff8c42",
  gold: "#ffb347",
  violet: "#8b2500",
  red: "#e63946",
  redBright: "#ff4757",
  orange: "#ff6b35",
  orangeBright: "#ff8c42",
  tournamentTeal: "#ff6b35",
  tournamentIndigo: "#e63946",
  tournamentRose: "#ff4757",
  tournamentGold: "#ffb347",
  cardDark: "#1a0808",
  cardGlow: "#ff6b35",
} as const;

/** Accent por modo de jogo (banner + bordas). */
export const MODE_ACCENT: Record<string, string> = {
  casual1v1: DOPAMINE.orange,
  custom1v1: DOPAMINE.redBright,
  rankedPresets1v1: DOPAMINE.red,
  rankedStake1v1: DOPAMINE.redBright,
  ranked1v1: DOPAMINE.red,
  tournament4: DOPAMINE.orange,
  tournament6: DOPAMINE.red,
  tournament8: DOPAMINE.redBright,
  tournament12: DOPAMINE.gold,
};

/** Variações de accent por arena — tons laranja/vermelho */
export const ARENA_ACCENT_COLORS = [
  DOPAMINE.orange,
  DOPAMINE.orangeBright,
  DOPAMINE.red,
  DOPAMINE.redBright,
  DOPAMINE.gold,
  DOPAMINE.ice,
] as const;
