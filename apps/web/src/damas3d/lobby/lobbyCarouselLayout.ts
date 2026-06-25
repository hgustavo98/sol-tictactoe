import { useMobileLayout } from "../../hooks/useMobileLayout";
import { useNarrowLayout } from "../../hooks/useNarrowLayout";

export type LobbyViewportTier = "desktop" | "tablet" | "mobile";

export function lobbyViewportTier(
  mobile: boolean,
  narrow: boolean,
): LobbyViewportTier {
  if (mobile) return "mobile";
  if (narrow) return "tablet";
  return "desktop";
}

export function carouselSpacing(tier: LobbyViewportTier): number {
  if (tier === "mobile") return 3.65;
  if (tier === "tablet") return 2.35;
  return 2.75;
}

/** Vertical offset of the carousel group in the 3D scene. */
export function carouselGroupY(
  tier: LobbyViewportTier,
  portrait = true,
): number {
  if (tier === "mobile") return portrait ? 0.42 : 0.22;
  if (tier === "tablet") return 0.72;
  return 0.55;
}

export function htmlDistanceFactor(
  offset: number,
  tier: LobbyViewportTier,
  portrait = true,
): number {
  const abs = Math.abs(offset);
  if (tier === "mobile") {
    return portrait ? 11.25 : 12.75;
  }
  if (tier === "tablet") {
    if (abs === 0) return 8.5;
    if (abs === 1) return 7.75;
    return 7;
  }
  if (abs === 0) return 7.5;
  if (abs === 1) return 6.75;
  return 6;
}

export function hitBoxSize(tier: LobbyViewportTier): [number, number, number] {
  if (tier === "mobile") return [3.8, 7.2, 0.25];
  if (tier === "tablet") return [5.2, 8.6, 0.25];
  return [5.8, 9.4, 0.25];
}

export function useLobbyViewportTier(): LobbyViewportTier {
  const mobile = useMobileLayout();
  const narrow = useNarrowLayout();
  return lobbyViewportTier(mobile, narrow);
}
