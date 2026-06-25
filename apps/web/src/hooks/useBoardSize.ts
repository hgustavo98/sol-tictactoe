import { useEffect, useState, type RefObject } from "react";

export const BOARD_FRAME_INSET = 52;

const MIN_BOARD = 320;
const MAX_BOARD = 960;

/** Board fills center column width; frame adds ~48px padding. */
export function useBoardSize(containerRef: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState(520);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const innerW = Math.floor(width);
      const innerH = Math.floor(height) - 48;
      const fromBounds = Math.min(innerW, innerH);
      const next = Math.min(
        MAX_BOARD,
        Math.max(MIN_BOARD, fromBounds),
      );
      setSize(next);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef]);

  return size;
}
