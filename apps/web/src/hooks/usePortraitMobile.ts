import { useEffect, useState } from "react";
import { isPortraitViewport } from "./viewportQueries";

export function usePortraitMobile() {
  const [portrait, setPortrait] = useState(isPortraitViewport);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const sync = () => setPortrait(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return portrait;
}
