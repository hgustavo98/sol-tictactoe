import { playDamasSound } from "./damas-sounds";

export { resumeDamasAudio } from "./damas-sounds";

export function soundBeforeMove(capture = false): void {
  playDamasSound(capture ? "capture" : "move");
}

export function soundForMoveHistory(moves: string[]): void {
  if (moves.length === 0) return;
  const last = moves[moves.length - 1] ?? "";
  playDamasSound(last.includes("x") ? "capture" : "move");
}
