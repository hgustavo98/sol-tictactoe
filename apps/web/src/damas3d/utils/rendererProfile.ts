export type ChessRendererTier = "high" | "low";

export interface ChessRendererProfile {
  tier: ChessRendererTier;
  dpr: [number, number];
  antialias: boolean;
  directionalShadows: boolean;
  contactShadows: boolean;
  environment: boolean;
  pieceCastShadow: boolean;
  shadowMapSize: number;
}

function isMobileLike(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isLowMemoryDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === "number" && memory > 0 && memory < 4;
}

export function detectChessRendererTier(): ChessRendererTier {
  if (isMobileLike() || isLowMemoryDevice()) return "low";
  return "high";
}

export function chessRendererProfile(tier: ChessRendererTier): ChessRendererProfile {
  if (tier === "low") {
    return {
      tier,
      dpr: [1, 1],
      antialias: false,
      directionalShadows: false,
      contactShadows: false,
      environment: false,
      pieceCastShadow: false,
      shadowMapSize: 512,
    };
  }

  return {
    tier,
    dpr: [1, 1.35],
    antialias: true,
    directionalShadows: false,
    contactShadows: true,
    environment: true,
    pieceCastShadow: false,
    shadowMapSize: 512,
  };
}
