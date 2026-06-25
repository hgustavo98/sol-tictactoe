import type { ReactNode } from "react";

interface ChessBoardFrameProps {
  boardWidth: number;
  children: ReactNode;
}

export function ChessBoardFrame({ boardWidth, children }: ChessBoardFrameProps) {
  return (
    <div className="chess-board-frame" style={{ width: boardWidth, maxWidth: "100%" }}>
      <div className="chess-board-frame-cap" aria-hidden />
      <div className="chess-board-frame-body">
        <div className="chess-board-frame-rim">
          <div className="chess-board-frame-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
