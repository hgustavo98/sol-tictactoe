import { useEffect, useState } from "react";
import { useMobileLayout } from "../hooks/useMobileLayout";
import { usePortraitMobile } from "../hooks/usePortraitMobile";

export interface SceneCameraConfig {
  position: [number, number, number];
  fov: number;
  minDistance: number;
  maxDistance: number;
}

export function chessCameraConfig(
  compact: boolean,
  portrait: boolean,
): SceneCameraConfig {
  if (compact && portrait) {
    return {
      position: [7.5, 26, -7.5],
      fov: 66,
      minDistance: 11,
      maxDistance: 30,
    };
  }
  if (compact) {
    return {
      position: [12.5, 13.5, -12.5],
      fov: 52,
      minDistance: 11,
      maxDistance: 28,
    };
  }
  return {
    position: [9, 10.5, -9],
    fov: 46,
    minDistance: 9.5,
    maxDistance: 24,
  };
}

function readChessViewport(): { compact: boolean; portrait: boolean } {
  if (typeof window === "undefined") {
    return { compact: false, portrait: false };
  }
  const { innerWidth, innerHeight } = window;
  return {
    compact: innerWidth <= 960,
    portrait: innerHeight > innerWidth,
  };
}

export function lobbyCameraConfig(
  mobile: boolean,
  portrait: boolean,
  minimalScene: boolean,
): { position: [number, number, number]; fov: number } {
  if (minimalScene) {
    if (mobile && portrait) return { position: [0, 1.5, 11.5], fov: 48 };
    if (mobile) return { position: [0, 1.35, 10.5], fov: 46 };
    return { position: [0, 1.2, 7.5], fov: 42 };
  }
  if (mobile && portrait) return { position: [0, 0.35, 13.25], fov: 46 };
  if (mobile) return { position: [0, 0.18, 12.75], fov: 44 };
  return { position: [0, 0.35, 9.2], fov: 48 };
}

export function useChessCameraConfig(): SceneCameraConfig {
  const mobile = useMobileLayout();
  const portraitMq = usePortraitMobile();
  const [viewport, setViewport] = useState(readChessViewport);

  useEffect(() => {
    const sync = () => setViewport(readChessViewport());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const compact = mobile || viewport.compact;
  const portrait = portraitMq || viewport.portrait;
  return chessCameraConfig(compact, portrait);
}

export function useLobbyCameraConfig(minimalScene: boolean) {
  const mobile = useMobileLayout();
  const portrait = usePortraitMobile();
  return lobbyCameraConfig(mobile, portrait, minimalScene);
}
