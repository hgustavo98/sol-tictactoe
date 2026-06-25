export type { GameOverResult } from "@sol-tictactoe/shared";

export type AppView = "lobby" | "waiting" | "game" | "history";

export interface ActiveMatch {
  matchId: string;
  role: "creator" | "joiner";
  onChainAddress?: string;
}
