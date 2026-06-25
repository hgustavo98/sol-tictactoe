export {
  CheckersEngine,
  simulateMove,
  colorForWallet,
  getLegalMoves,
  INITIAL_CHECKERS_FEN,
  type CheckersMovePayload,
} from "@sol-tictactoe/shared";

export type MovePayload = import("@sol-tictactoe/shared").CheckersMovePayload;
