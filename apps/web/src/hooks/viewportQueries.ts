/** Phone portrait and short landscape viewports (Chrome device presets). */
export const COMPACT_SHELL_MQ =
  "(max-width: 768px), (max-width: 960px) and (max-height: 520px)";

/** Open-tables sheet + narrow chrome (phones, landscape phones, small tablets). */
export const SHEET_LAYOUT_MQ =
  "(max-width: 960px), (max-width: 1180px) and (max-height: 520px), (min-width: 769px) and (max-width: 1180px) and (orientation: portrait), (orientation: landscape) and (max-height: 900px) and (min-width: 769px) and (max-width: 1366px)";

/** Tablet portrait (iPad Air, iPad Pro, etc.). */
export const TABLET_PORTRAIT_MQ =
  "(min-width: 769px) and (max-width: 1180px) and (orientation: portrait)";

/** Tablet / phone landscape with limited vertical space. */
export const SHORT_LANDSCAPE_MQ =
  "(orientation: landscape) and (max-height: 900px) and (max-width: 1366px)";

/** Desktop com espaço vertical suficiente para cartões grandes no carrossel. */
export const WIDE_LOBBY_MQ = "(min-width: 1101px) and (min-height: 600px)";

export function isCompactShellViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(COMPACT_SHELL_MQ).matches;
}

export function isSheetLayoutViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(SHEET_LAYOUT_MQ).matches;
}

export function isPortraitViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(orientation: portrait)").matches;
}

export function isWideLobbyViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(WIDE_LOBBY_MQ).matches;
}
