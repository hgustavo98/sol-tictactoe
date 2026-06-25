import { useEffect, useState } from "react";
import { isWideLobbyViewport, WIDE_LOBBY_MQ } from "./viewportQueries";

const NARROW_LAYOUT_MQ = "(max-width: 1100px)";

/** Telas com tabuleiro à esquerda e rail (perfil + mesas) à direita. */
export function useNarrowLayout() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(NARROW_LAYOUT_MQ).matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(NARROW_LAYOUT_MQ);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return narrow;
}

/** Desktop largo — cartões do carrossel em escala maior. */
export function useWideLobbyLayout() {
  const [wide, setWide] = useState(isWideLobbyViewport);

  useEffect(() => {
    const mq = window.matchMedia(WIDE_LOBBY_MQ);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return wide;
}
