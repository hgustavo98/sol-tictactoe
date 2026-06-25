import type { GameState, PlayerProfile } from "@sol-tictactoe/shared";
import type { Socket } from "socket.io-client";
import { TttGame2D } from "../ttt2d/TttGame2D";

interface ChessGameProps {
  socket: Socket | null;
  game: GameState;
  playerId?: string;
  myProfile?: PlayerProfile | null;
  opponentProfile?: PlayerProfile | null;
  embedded?: boolean;
  onResign?: () => void;
}

export function ChessGame(props: ChessGameProps) {
  return <TttGame2D {...props} />;
}
