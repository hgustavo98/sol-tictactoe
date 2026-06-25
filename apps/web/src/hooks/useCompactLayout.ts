import { useEffect, useState } from "react";
import {
  COMPACT_SHELL_MQ,
  SHEET_LAYOUT_MQ,
  isCompactShellViewport,
  isSheetLayoutViewport,
} from "./viewportQueries";

export function isCompactLayout(): boolean {
  return isCompactShellViewport();
}

export function isSheetLayout(): boolean {
  return isSheetLayoutViewport();
}

/** True em telemóveis, landscape estreito e viewports compactos simuláveis no Chrome. */
export function useCompactLayout(): boolean {
  const [compact, setCompact] = useState(isCompactLayout);

  useEffect(() => {
    const media = window.matchMedia(COMPACT_SHELL_MQ);
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return compact;
}

/** Painel de mesas em formato sheet. */
export function useSheetLayout(): boolean {
  const [sheet, setSheet] = useState(isSheetLayout);

  useEffect(() => {
    const media = window.matchMedia(SHEET_LAYOUT_MQ);
    const sync = () => setSheet(media.matches);
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return sheet;
}
