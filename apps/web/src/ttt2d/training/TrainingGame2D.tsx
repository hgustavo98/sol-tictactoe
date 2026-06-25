import {
  TictactoeEngine,
  INITIAL_TTT_FEN,
} from "@sol-tictactoe/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { TttBoard } from "../TttBoard";
import { pickTrainingMove } from "./trainingAi";

interface TrainingGame2DProps {
  onExit: () => void;
  embedded?: boolean;
}

export function TrainingGame2D({ onExit }: TrainingGame2DProps) {
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
      setFen(board.fen());
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
      if (move) applyMove(move.to);
      setAiThinking(false);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [fen, aiColor, ended, aiThinking, engine, applyMove]);

  const reset = () => {
    setFen(INITIAL_TTT_FEN);
    setMoves([]);
    setEnded(false);
    setEndMessage("");
    setAiThinking(false);
  };

  const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;

  return (
    <div className="xtt-match">
      <div className="xtt-training-bar">
        <button type="button" className="xtt-link" onClick={onExit}>
          <ArrowLeft className="inline size-3" /> {t("training.exit")}
        </button>
        <span>{t("training.title")}</span>
        <div className="xtt-training-tools">
          <button type="button" className="xtt-link" onClick={() => { reset(); setPlayerColor((c) => (c === "w" ? "b" : "w")); }}>
            {t("training.swapColor")}
          </button>
          <button type="button" className="xtt-link" onClick={reset}>
            <RotateCcw className="inline size-3" />
          </button>
        </div>
      </div>

      {ended && <p className="xtt-status xtt-status-yours">{endMessage}</p>}
      {aiThinking && <p className="xtt-status">{t("training.thinking")}</p>}

      <TttBoard
        fen={fen}
        myColor={playerColor}
        isMyTurn={isPlayerTurn}
        onCellClick={applyMove}
        lastMove={lastMove}
      />
    </div>
  );
}
