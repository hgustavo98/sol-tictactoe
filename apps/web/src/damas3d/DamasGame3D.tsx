import {
  TictactoeEngine,
  getLegalMoves,
  type GameState,
  type PlayerProfile,
} from "@sol-tictactoe/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Flag } from "lucide-react";
import { SOCKET_EVENTS } from "@sol-tictactoe/shared";
import type { Socket } from "socket.io-client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResignConfirmDialog } from "@/components/ResignConfirmDialog";
import type { BoardOrientation } from "./types";
import { resumeDamasAudio, soundBeforeMove } from "./audio/moveSound";
import { playTurnSound } from "./audio/damas-sounds";
import { DamasScene3D } from "./components/DamasScene3D";
import { CustomizeDock } from "./components/CustomizePanel";
import { AudioMuteToggle } from "./components/AudioMuteToggle";
import { PlayerColorBadge } from "./components/PlayerColorBadge";
import { TurnNoticePopup, useTurnChangePulse } from "./components/YourTurnPopup";
import { GameClockOverlay } from "./components/GameClockOverlay";
import { DisconnectGraceBanner } from "./components/DisconnectGraceBanner";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";

interface DamasGame3DProps {
  socket: Socket | null;
  game: GameState;
  playerId?: string;
  myProfile?: PlayerProfile | null;
  opponentProfile?: PlayerProfile | null;
  embedded?: boolean;
  onResign?: () => void;
}

export function DamasGame3D({
  socket,
  game,
  playerId: playerIdProp,
  myProfile,
  opponentProfile,
  embedded = false,
  onResign,
}: DamasGame3DProps) {
  const { t } = useTranslation();
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58();
  const playerId = playerIdProp ?? wallet;
  const fetchedMyProfile = usePlayerProfile(playerId);
  const effectiveMyProfile = fetchedMyProfile ?? myProfile;
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const syncedMoves = useRef(game.moves.length);
  const skipRemoteSound = useRef(false);

  const engine = useMemo(() => new TictactoeEngine(game.fen), [game.fen]);

  const myColor =
    playerId === game.playerWhite
      ? "w"
      : playerId === game.playerBlack
        ? "b"
        : null;
  const orientation: BoardOrientation = myColor === "b" ? "black" : "white";
  const isMyTurn = myColor === game.turn && game.status === "playing";
  const inPlay = Boolean(myColor) && game.status === "playing";
  const turnPulse = useTurnChangePulse(game.turn, inPlay);

  const activeWallet =
    game.turn === "w" ? game.playerWhite : game.playerBlack;
  const activeIsMe = activeWallet === playerId;
  const activeProfile =
    activeIsMe
      ? (effectiveMyProfile ??
        (playerId ? { wallet: playerId, nickname: null, avatarUrl: null } : null))
      : (opponentProfile ??
        (activeWallet ? { wallet: activeWallet, nickname: null, avatarUrl: null } : null));

  useEffect(() => {
    if (turnPulse <= 0 || !inPlay) return;
    resumeDamasAudio();
    playTurnSound(activeIsMe);
  }, [turnPulse, inPlay, activeIsMe]);

  const legalTargets = useMemo(() => {
    if (!selectedSquare || !isMyTurn) return [];
    return engine.legalMoves(selectedSquare).map((m) => m.to);
  }, [engine, selectedSquare, isMyTurn]);

  const lastMoveSquares = useMemo(() => {
    if (game.moves.length === 0) return [] as string[];
    const replay = new TictactoeEngine();
    for (const move of game.moves) {
      const [from, to] = move.split("-");
      if (from && to) replay.move({ from, to });
    }
    const last = game.moves[game.moves.length - 1];
    const parts = last?.split("-");
    return parts?.length === 2 ? [parts[0], parts[1]] : [];
  }, [game.moves]);

  useEffect(() => {
    syncedMoves.current = game.moves.length;
  }, [game.moves]);

  const sendMove = useCallback(
    (from: string, to: string) => {
      if (!socket || !playerId) return;
      socket.emit(SOCKET_EVENTS.GAME_MOVE, {
        matchId: game.matchId,
        wallet: playerId,
        from,
        to,
      });
      setSelectedSquare(null);
    },
    [socket, playerId, game.matchId],
  );

  const tryMove = useCallback(
    (from: string, to: string) => {
      if (!isMyTurn) return;
      try {
        resumeDamasAudio();
        soundBeforeMove();
        engine.move({ from, to });
        skipRemoteSound.current = true;
        sendMove(from, to);
      } catch {
        setSelectedSquare(null);
      }
    },
    [engine, isMyTurn, sendMove],
  );

  const onSquareClick = useCallback(
    (square: string) => {
      if (!isMyTurn) return;
      resumeDamasAudio();
      if (selectedSquare && legalTargets.includes(square)) {
        tryMove(selectedSquare, square);
        return;
      }
      const piece = engine.pieceAt(square);
      if (piece && piece.color === myColor) {
        setSelectedSquare(square);
      } else {
        setSelectedSquare(null);
      }
    },
    [engine, isMyTurn, legalTargets, myColor, selectedSquare, tryMove],
  );

  const onPieceClick = useCallback(
    (square: string) => {
      onSquareClick(square);
    },
    [onSquareClick],
  );

  return (
    <div className={cn("damas3d-root", embedded && "damas3d-root-embedded")}>
      <DamasScene3D
        fen={game.fen}
        orientation={orientation}
        selectedSquare={selectedSquare}
        highlightSquares={legalTargets}
        lastMoveSquares={lastMoveSquares}
        interactive={isMyTurn}
        onSquareClick={onSquareClick}
        onPieceClick={onPieceClick}
      />

      <GameClockOverlay game={game} myColor={myColor} />
      <DisconnectGraceBanner game={game} playerId={playerId} />

      <div className="damas3d-turn-banner">
        <TurnNoticePopup
          pulse={turnPulse}
          isMyTurn={activeIsMe}
          actor={activeProfile}
        />
      </div>

      {!embedded && (
        <div className="damas3d-overlay-left">
          {myColor && <PlayerColorBadge color={myColor} />}
        </div>
      )}

      <div className="damas3d-overlay damas3d-overlay-top-right">
        <div className="damas3d-overlay-actions">
          {!embedded && inPlay && myColor && onResign && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="damas3d-resign-btn"
              onClick={() => setResignOpen(true)}
            >
              <Flag className="size-3.5" />
              {t("profile.resign")}
            </Button>
          )}
          <AudioMuteToggle />
          <CustomizeDock open={customizeOpen} onOpenChange={setCustomizeOpen} />
        </div>
      </div>

      {!embedded && onResign && (
        <ResignConfirmDialog
          open={resignOpen}
          onOpenChange={setResignOpen}
          hasBet={game.betLamports > 0}
          onConfirm={onResign}
        />
      )}
    </div>
  );
}
