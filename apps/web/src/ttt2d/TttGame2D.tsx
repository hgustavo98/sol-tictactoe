import {
  TictactoeEngine,
  colorForWallet,
  SOCKET_EVENTS,
  type GameState,
  type PlayerProfile,
} from "@sol-tictactoe/shared";
import { useCallback, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Flag } from "lucide-react";
import type { Socket } from "socket.io-client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResignConfirmDialog } from "@/components/ResignConfirmDialog";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { shortenAddress } from "@sol-tictactoe/shared";
import { TttBoard, getWinningLine } from "./TttBoard";
import { TTT_THEME } from "./theme";

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
  embedded = false,
  onResign,
}: TttGame2DProps) {
  const { t } = useTranslation();
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58();
  const playerId = playerIdProp ?? wallet;
  const fetchedMyProfile = usePlayerProfile(playerId);
  const effectiveMyProfile = fetchedMyProfile ?? myProfile;
  const [resignOpen, setResignOpen] = useState(false);

  const myColor = colorForWallet(playerId ?? "", game.playerWhite, game.playerBlack);
  const isMyTurn = myColor === game.turn && game.status === "playing";
  const inPlay = Boolean(myColor) && game.status === "playing";

  const opponentWallet =
    playerId === game.playerWhite ? game.playerBlack : game.playerWhite;
  const opponent =
    opponentProfile ??
    (opponentWallet
      ? { wallet: opponentWallet, nickname: null, avatarUrl: null }
      : null);

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

  const activeWallet = game.turn === "w" ? game.playerWhite : game.playerBlack;
  const activeIsMe = activeWallet === playerId;

  return (
    <div className={cn("ttt-game-root", embedded && "ttt-game-root-embedded")}>
      <div className="ttt-game-header">
        <div className={cn("ttt-player-card", !activeIsMe && game.turn === "b" && "ttt-player-active")}>
          <PlayerAvatar profile={opponent} size="md" />
          <div className="ttt-player-meta">
            <span className="ttt-player-name">
              {opponent?.nickname ?? shortenAddress(opponentWallet ?? "")}
            </span>
            <span className="ttt-player-mark" style={{ color: TTT_THEME.oColor }}>O</span>
          </div>
          <span className="ttt-clock">{formatClock(game.blackTimeMs)}</span>
        </div>

        <div className="ttt-turn-indicator">
          {inPlay && (
            <span className={cn("ttt-turn-pill", activeIsMe && "ttt-turn-pill-yours")}>
              {activeIsMe ? t("ttt.yourTurn") : t("ttt.opponentTurn")}
            </span>
          )}
          {game.betLamports > 0 && (
            <span className="ttt-pot-badge">
              {(game.potLamports / 1e9).toFixed(2)} SOL
            </span>
          )}
        </div>

        <div className={cn("ttt-player-card", activeIsMe && game.turn === "w" && "ttt-player-active")}>
          <PlayerAvatar profile={effectiveMyProfile} size="md" />
          <div className="ttt-player-meta">
            <span className="ttt-player-name">
              {effectiveMyProfile?.nickname ?? shortenAddress(playerId ?? "")}
            </span>
            <span className="ttt-player-mark" style={{ color: TTT_THEME.xColor }}>X</span>
          </div>
          <span className="ttt-clock">{formatClock(game.whiteTimeMs)}</span>
        </div>
      </div>

      <TttBoard
        fen={game.fen}
        myColor={myColor}
        isMyTurn={isMyTurn}
        onCellClick={handleCellClick}
        winningLine={winningLine}
        lastMove={lastMove}
      />

      {inPlay && (
        <div className="ttt-game-actions">
          <Button
            variant="outline"
            size="sm"
            className="ttt-resign-btn"
            onClick={() => setResignOpen(true)}
          >
            <Flag className="size-3.5" />
            {t("game.resign")}
          </Button>
        </div>
      )}

      <ResignConfirmDialog
        open={resignOpen}
        onOpenChange={setResignOpen}
        onConfirm={handleResign}
      />
    </div>
  );
}
