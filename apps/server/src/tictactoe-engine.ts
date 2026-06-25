export {
  TictactoeEngine,
  CheckersEngine,
  simulateMove,
  colorForWallet,
  getLegalMoves,
  INITIAL_TTT_FEN,
  INITIAL_CHECKERS_FEN,
  type TttMovePayload,
  type CheckersMovePayload,
} from "@sol-tictactoe/shared";

export type MovePayload = import("@sol-tictactoe/shared").TttMovePayload;
