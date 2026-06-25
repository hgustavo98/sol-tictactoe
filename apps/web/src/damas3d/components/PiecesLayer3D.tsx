import { useMemo } from "react";
import type { PieceSetTheme, PlacedPiece } from "../types";
import { parseCheckersFen, squareToWorld } from "../utils/coords";
import { CheckersPieceMesh } from "./CheckersPieceMesh";

interface PiecesLayer3DProps {
  fen: string;
  pieceSet: PieceSetTheme;
  selectedSquare: string | null;
  onPieceClick: (square: string) => void;
  pieceCastShadow?: boolean;
}

export function PiecesLayer3D({
  fen,
  pieceSet,
  selectedSquare,
  onPieceClick,
  pieceCastShadow = false,
}: PiecesLayer3DProps) {
  const pieces = useMemo(() => parseCheckersFen(fen), [fen]);

  return (
    <group>
      {pieces.map((piece) => (
        <PieceNode
          key={`${piece.square}-${piece.kind}-${piece.color}`}
          piece={piece}
          pieceSet={pieceSet}
          selected={selectedSquare === piece.square}
          onPieceClick={onPieceClick}
          pieceCastShadow={pieceCastShadow}
        />
      ))}
    </group>
  );
}

function PieceNode({
  piece,
  pieceSet,
  selected,
  onPieceClick,
  pieceCastShadow,
}: {
  piece: PlacedPiece;
  pieceSet: PieceSetTheme;
  selected: boolean;
  onPieceClick: (square: string) => void;
  pieceCastShadow: boolean;
}) {
  const [x, , z] = squareToWorld(piece.square);
  const material =
    piece.color === "w" ? pieceSet.white : pieceSet.black;

  return (
    <group position={[x, 0, z]}>
      <CheckersPieceMesh
        kind={piece.kind}
        material={material}
        selected={selected}
        castShadow={pieceCastShadow}
        onClick={(e) => {
          e.stopPropagation();
          onPieceClick(piece.square);
        }}
      />
    </group>
  );
}
