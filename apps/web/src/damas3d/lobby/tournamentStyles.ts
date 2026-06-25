import type { CSSProperties } from "react";
import type { GameModeId } from "@sol-tictactoe/shared";

export function tournamentAccent(_mode: GameModeId): string {
  return "#ff6b35";
}

export function tournamentGlow(_mode: GameModeId): string {
  return "rgba(255, 107, 53, 0.4)";
}

export function accentStatStyle(accent: string): CSSProperties {
  return { color: accent };
}

export function tournamentPrimaryBtnClass(_mode: GameModeId): string {
  return "lobby-tournament-primary-btn";
}
