const STORAGE_KEY = "sol-ttt-audio-muted";

function loadMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

let muted = loadMuted();
const listeners = new Set<() => void>();

export function isChessAudioMuted(): boolean {
  return muted;
}

export function setChessAudioMuted(value: boolean): void {
  if (muted === value) return;
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
  for (const listener of listeners) listener();
}

export function toggleChessAudioMuted(): boolean {
  setChessAudioMuted(!muted);
  return muted;
}

export function subscribeChessAudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
