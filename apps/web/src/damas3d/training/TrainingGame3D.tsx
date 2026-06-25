import { TictactoeEngine, INITIAL_TTT_FEN } from "@sol-tictactoe/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DamasScene3D } from "../components/DamasScene3D";
import { CustomizeDock } from "../components/CustomizePanel";
import { AudioMuteToggle } from "../components/AudioMuteToggle";
import { pickTrainingMove } from "./trainingAi";
import { PlayerColorBadge } from "../components/PlayerColorBadge";
import { TurnNoticePopup, useTurnChangePulse } from "../components/YourTurnPopup";
import { playTurnSound, resumeDamasAudio } from "../audio/damas-sounds";
import { soundBeforeMove } from "../audio/moveSound";
import type { BoardOrientation, PieceColor } from "../types";

interface TrainingGame3DProps {
  onExit: () => void;
  embedded?: boolean;
}

export function TrainingGame3D({ onExit, embedded = false }: TrainingGame3DProps) {
  const { t } = useTranslation();
  const [playerColor, setPlayerColor] = useState<PieceColor>("w");
  const [fen, setFen] = useState(INITIAL_TTT_FEN);
  const [moves, setMoves] = useState<string[]>([]);
  const [ended, setEnded] = useState(false);
  const [endMessage, setEndMessage] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const aiColor: PieceColor = playerColor === "w" ? "b" : "w";
  const orientation: BoardOrientation = playerColor === "w" ? "white" : "black";

  const engine = useMemo(() => new TictactoeEngine(fen), [fen]);
  const isPlayerTurn = engine.turn() === playerColor && !ended && !aiThinking;
  const turnPulse = useTurnChangePulse(engine.turn(), !ended);

  useEffect(() => {
    if (turnPulse <= 0 || ended) return;
    resumeDamasAudio();
    playTurnSound(isPlayerTurn);
  }, [turnPulse, ended, isPlayerTurn]);

  const legalTargets = useMemo(() => {
    if (!selectedSquare || !isPlayerTurn) return [];
    return engine.legalMoves(selectedSquare).map((m) => m.to);
  }, [engine, selectedSquare, isPlayerTurn]);

  const lastMoveSquares = useMemo(() => {
    if (moves.length === 0) return [] as string[];
    const last = moves[moves.length - 1];
    const parts = last?.split("-");
    return parts?.length === 2 ? [parts[0], parts[1]] : [];
  }, [moves]);

  const finishIfOver = useCallback(
    (board: TictactoeEngine) => {
      if (!board.isGameOver()) return;
      setEnded(true);
      if (board.isCheckmate()) {
        setEndMessage(
          board.turn() === playerColor ? t("training.lose") : t("training.win"),
        );
      } else {
        setEndMessage(t("training.draw"));
      }
    },
    [playerColor, t],
  );

  const applyMove = useCallback(
    (from: string, to: string) => {
      const board = new TictactoeEngine(fen);
      try {
        soundBeforeMove(Boolean(board.legalMoves(from).find((m) => m.to === to)?.captured?.length));
        board.move({ from, to });
      } catch {
        return false;
      }
      setFen(board.fen());
      setMoves((prev) => [...prev, `${from}-${to}`]);
      setSelectedSquare(null);
      finishIfOver(board);
      return true;
    },
    [fen, finishIfOver],
  );

  useEffect(() => {
    if (ended || aiThinking || engine.turn() !== aiColor) return;
    setAiThinking(true);
    const timer = window.setTimeout(() => {
      const move = pickTrainingMove(fen, aiColor);
      if (move) applyMove(move.from, move.to);
      setAiThinking(false);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [fen, ended, aiThinking, engine, aiColor, applyMove]);

  const onSquareClick = useCallback(
    (square: string) => {
      if (!isPlayerTurn) return;
      if (selectedSquare && legalTargets.includes(square)) {
        applyMove(selectedSquare, square);
        return;
      }
      const piece = engine.pieceAt(square);
      if (piece?.color === playerColor) setSelectedSquare(square);
      else setSelectedSquare(null);
    },
    [isPlayerTurn, selectedSquare, legalTargets, applyMove, engine, playerColor],
  );

  const reset = () => {
    setFen(INITIAL_TTT_FEN);
    setMoves([]);
    setEnded(false);
    setEndMessage("");
    setSelectedSquare(null);
  };

  return (
    <div className={cn("damas3d-root", embedded && "damas3d-root-embedded")}>
      <DamasScene3D
        fen={fen}
        orientation={orientation}
        selectedSquare={selectedSquare}
        highlightSquares={legalTargets}
        lastMoveSquares={lastMoveSquares}
        interactive={isPlayerTurn}
        onSquareClick={onSquareClick}
        onPieceClick={onSquareClick}
      />

      <div className="training-top-back">
        <Button type="button" variant="outline" size="sm" className="training-top-back-btn" onClick={onExit}>
          <ArrowLeft className="size-3.5" />
          <span className="damas3d-btn-label">{t("training.exit")}</span>
        </Button>
      </div>

      <div className="damas3d-overlay-left">
        <PlayerColorBadge color={playerColor} />
      </div>

      <div className="damas3d-overlay damas3d-overlay-top-right">
        <AudioMuteToggle />
        <CustomizeDock open={customizeOpen} onOpenChange={setCustomizeOpen} />
      </div>

      {ended && (
        <div className="training-bottom-left">
          <span className="training-bottom-left-badge">{endMessage}</span>
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="size-3.5" />
            {t("training.replay")}
          </Button>
        </div>
      )}
    </div>
  );
}
