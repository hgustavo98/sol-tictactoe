import captureSample from "../../assets/chess/sounds/kill-chess.wav?url";
import moveSample from "../../assets/chess/sounds/move-chess.wav?url";
import { isChessAudioMuted } from "./damas-audio-settings";

type ChessSound = "move" | "capture" | "turn-yours" | "turn-opponent";

const SAMPLE_URLS: Partial<Record<ChessSound, string>> = {
  move: moveSample,
  capture: captureSample,
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

function playSample(url: string): void {
  const audio = new Audio(url);
  audio.volume = 1;
  void audio.play().catch(() => {});
}

function playTone(
  frequency: number,
  startTime: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = "sine",
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export function playChessSound(sound: ChessSound): void {
  if (isChessAudioMuted()) return;

  const sample = SAMPLE_URLS[sound];
  if (sample) {
    playSample(sample);
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime + 0.001;

  if (sound === "turn-yours") {
    playTone(587, t, 0.1, 0.11, "sine");
    playTone(880, t + 0.09, 0.14, 0.09, "sine");
    return;
  }

  playTone(392, t, 0.09, 0.07, "triangle");
}

export function playTurnSound(yours: boolean): void {
  playChessSound(yours ? "turn-yours" : "turn-opponent");
}

export function resumeChessAudio(): void {
  void getAudioContext()?.resume();
}

export const playDamasSound = playChessSound;
export const resumeDamasAudio = resumeChessAudio;
