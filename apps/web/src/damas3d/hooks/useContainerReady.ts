import { useEffect, useState, type RefObject } from "react";

const MIN_PX = 48;

/** Wait until the canvas host has real dimensions (avoids WebGL init on 0×0 layout). */
export function useContainerReady(ref: RefObject<HTMLElement | null>): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sync = () => {
      const { width, height } = el.getBoundingClientRect();
      setReady(width >= MIN_PX && height >= MIN_PX);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, [ref]);

  return ready;
}
