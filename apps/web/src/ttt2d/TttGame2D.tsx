import {
  TictactoeEngine,
  colorForWallet,
  SOCKET_EVENTS,
  type GameState,
  type PlayerProfile,
} from "@sol-tictactoe/shared";
import { useCallback, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Socket } from "socket.io-client";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ResignConfirmDialog } from "@/components/ResignConfirmDialog";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { shortenAddress } from "@sol-tictactoe/shared";
import { TttBoard, getWinningLine } from "./TttBoard";
import { GAME_THEME } from "./theme";

interface TttGame2DProps {
  socket: Socket | null;
  game: GameState;
  playerId?: string;
  myProfile?: PlayerProfile | null;
  opponentProfile?: PlayerProfile | null;
  embedded?: boolean;
  onResign?: () => void;
}

function formatClock(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TttGame2D({
  socket,
  game,
  playerId: playerIdProp,
  myProfile,
  opponentProfile,
  onResign,
}: TttGame2DProps) {
  const { t } = useTranslation();
  const { publicKey } = useWallet();
  const playerId = playerIdProp ?? publicKey?.toBase58();
  const fetchedMyProfile = usePlayerProfile(playerId);
  const effectiveMyProfile = fetchedMyProfile ?? myProfile;
  const [resignOpen, setResignOpen] = useState(false);

  const myColor = colorForWallet(playerId ?? "", game.playerWhite, game.playerBlack);
  const isMyTurn = myColor === game.turn && game.status === "playing";
  const inPlay = Boolean(myColor) && game.status === "playing";

  const opponentWallet =
    playerId === game.playerWhite ? game.playerBlack : game.playerWhite;
  const opponentName =
    opponentProfile?.nickname ?? shortenAddress(opponentWallet ?? "");
  const myName =
    effectiveMyProfile?.nickname ?? shortenAddress(playerId ?? "");

  const winningLine = useMemo(() => getWinningLine(game.fen), [game.fen]);
  const lastMove = game.moves.length > 0 ? game.moves[game.moves.length - 1] : null;

  const handleCellClick = useCallback(
    (cell: string) => {
      if (!socket || !playerId || !isMyTurn) return;
      socket.emit(SOCKET_EVENTS.GAME_MOVE, {
        matchId: game.matchId,
        wallet: playerId,
        from: cell,
        to: cell,
      });
    },
    [socket, playerId, isMyTurn, game.matchId],
  );

  const handleResign = () => {
    if (onResign) {
      onResign();
      return;
    }
    if (!socket || !playerId) return;
    socket.emit(SOCKET_EVENTS.GAME_RESIGN, {
      matchId: game.matchId,
      wallet: playerId,
    });
  };

  const iAmWhite = myColor === "w";
  const topName = iAmWhite ? opponentName : myName;
  const bottomName = iAmWhite ? myName : opponentName;
  const topActive = inPlay && game.turn === "b";
  const bottomActive = inPlay && game.turn === "w";

  return (
    <div className="xtt-match">
      <div className={cn("xtt-player-row", topActive && "xtt-player-row-active")}>
        <div className="xtt-player-left">
          <span className="xtt-mark" style={{ color: GAME_THEME.oColor }}>O</span>
          <span className="xtt-player-name">{topName}</span>
        </div>
        <span className="xtt-clock">{formatClock(game.blackTimeMs)}</span>
      </div>

      {inPlay && (
        <p className={cn("xtt-status", isMyTurn && "xtt-status-yours")}>
          {isMyTurn ? t("ticTacToe.yourTurn") : t("ticTacToe.opponentTurn")}
        </p>
      )}

      {game.betLamports > 0 && (
        <p className="xtt-pot">{(game.potLamports / 1e9).toFixed(2)} SOL</p>
      )}

      <TttBoard
        fen={game.fen}
        myColor={myColor}
        isMyTurn={isMyTurn}
        onCellClick={handleCellClick}
        winningLine={winningLine}
        lastMove={lastMove}
      />

      <div className={cn("xtt-player-row", bottomActive && "xtt-player-row-active")}>
        <div className="xtt-player-left">
          <span className="xtt-mark" style={{ color: GAME_THEME.xColor }}>X</span>
          <span className="xtt-player-name">{bottomName}</span>
        </div>
        <span className="xtt-clock">{formatClock(game.whiteTimeMs)}</span>
      </div>

      {inPlay && (
        <button type="button" className="xtt-resign" onClick={() => setResignOpen(true)}>
          {t("game.resign")}
        </button>
      )}

      <ResignConfirmDialog
        open={resignOpen}
        onOpenChange={setResignOpen}
        onConfirm={handleResign}
      />
    </div>
  );
}
