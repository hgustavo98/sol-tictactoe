import { useEffect, useState } from "react";
import { COMPACT_SHELL_MQ, isCompactShellViewport } from "./viewportQueries";

export function useMobileLayout() {
  const [mobile, setMobile] = useState(isCompactShellViewport);

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_SHELL_MQ);
    const sync = () => setMobile(mq.matches);
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

  return mobile;
}
