import { useCallback, useEffect, useState } from "react";
import {
  isChessAudioMuted,
  subscribeChessAudio,
  toggleChessAudioMuted,
} from "../audio/damas-audio-settings";

export function useDamasAudioMuted() {
  const [muted, setMuted] = useState(isChessAudioMuted);

  useEffect(() => subscribeChessAudio(() => setMuted(isChessAudioMuted())), []);

  const toggleMuted = useCallback(() => {
    toggleChessAudioMuted();
  }, []);

  return { muted, toggleMuted };
}
