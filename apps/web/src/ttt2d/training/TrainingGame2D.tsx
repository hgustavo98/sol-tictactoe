import {
  TictactoeEngine,
  INITIAL_TTT_FEN,
} from "@sol-tictactoe/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TttBoard } from "../TttBoard";
import { pickTrainingMove } from "./trainingAi";

interface TrainingGame2DProps {
  onExit: () => void;
  embedded?: boolean;
}

export function TrainingGame2D({ onExit, embedded = false }: TrainingGame2DProps) {
  const { t } = useTranslation();
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [fen, setFen] = useState(INITIAL_TTT_FEN);
  const [moves, setMoves] = useState<string[]>([]);
  const [ended, setEnded] = useState(false);
  const [endMessage, setEndMessage] = useState("");
  const [aiThinking, setAiThinking] = useState(false);

  const aiColor: "w" | "b" = playerColor === "w" ? "b" : "w";
  const engine = useMemo(() => new TictactoeEngine(fen), [fen]);
  const isPlayerTurn = engine.turn() === playerColor && !ended && !aiThinking;

  const finishIfOver = useCallback(
    (board: TictactoeEngine) => {
      if (!board.isGameOver()) return;
      setEnded(true);
      if (board.isCheckmate()) {
        setEndMessage(
          board.winner() === playerColor ? t("training.win") : t("training.lose"),
        );
      } else {
        setEndMessage(t("training.draw"));
      }
    },
    [playerColor, t],
  );

  const applyMove = useCallback(
    (cell: string) => {
      const board = new TictactoeEngine(fen);
      try {
        board.move({ from: cell, to: cell });
      } catch {
        return;
      }
      const nextFen = board.fen();
      setFen(nextFen);
      setMoves((m) => [...m, cell]);
      finishIfOver(board);
    },
    [fen, finishIfOver],
  );

  useEffect(() => {
    if (ended || aiThinking) return;
    if (engine.turn() !== aiColor) return;

    setAiThinking(true);
    const timer = window.setTimeout(() => {
      const move = pickTrainingMove(fen, aiColor);
      if (move) {
        applyMove(move.to);
      }
      setAiThinking(false);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [fen, aiColor, ended, aiThinking, engine, applyMove]);

  const reset = () => {
    setFen(INITIAL_TTT_FEN);
    setMoves([]);
    setEnded(false);
    setEndMessage("");
    setAiThinking(false);
  };

  const swapColor = () => {
    reset();
    setPlayerColor((c) => (c === "w" ? "b" : "w"));
  };

  const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;

  return (
    <div className={cn("ttt-game-root ttt-training-root", embedded && "ttt-game-root-embedded")}>
      <div className="ttt-training-toolbar">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <ArrowLeft className="size-4" />
          {t("training.exit")}
        </Button>
        <span className="ttt-training-label">{t("training.title")}</span>
        <div className="ttt-training-tools">
          <Button variant="outline" size="sm" onClick={swapColor}>
            {t("training.swapColor")}
          </Button>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="size-3.5" />
            {t("training.reset")}
          </Button>
        </div>
      </div>

      {ended && <p className="ttt-training-result">{endMessage}</p>}

      <TttBoard
        fen={fen}
        myColor={playerColor}
        isMyTurn={isPlayerTurn}
        onCellClick={applyMove}
        lastMove={lastMove}
      />

      {aiThinking && (
        <p className="ttt-training-thinking">{t("training.thinking")}</p>
      )}
    </div>
  );
}
