import type { BotPersona } from "@sol-tictactoe/shared";
import { TictactoeEngine } from "@sol-tictactoe/shared";
import { pickTttMove } from "./simple-ttt-ai";

export type EngineMove = { from: string; to: string };

export async function probeStockfish(): Promise<boolean> {
  return false;
}

export async function pickEngineMove(
  fen: string,
  _persona?: BotPersona,
  _strictDraw?: boolean,
): Promise<EngineMove | null> {
  const engine = new TictactoeEngine(fen);
  return pickTttMove(fen, engine.turn());
}

export function shutdownStockfish(): void {
  /* no-op */
}
