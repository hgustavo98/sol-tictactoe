import type { BoardTheme } from "../types";
import { buildSquares } from "../utils/coords";

interface Board3DProps {
  theme: BoardTheme;
  selectedSquare: string | null;
  highlightSquares: string[];
  lastMoveSquares: string[];
  onSquareClick: (square: string) => void;
}

const SQUARES = buildSquares();

export function Board3D({
  theme,
  selectedSquare,
  highlightSquares,
  lastMoveSquares,
  onSquareClick,
}: Board3DProps) {
  return (
    <group>
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[9.2, 0.16, 9.2]} />
        <meshStandardMaterial color={theme.frame} roughness={0.85} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[8.6, 0.08, 8.6]} />
        <meshStandardMaterial color={theme.rim} roughness={0.7} metalness={0.15} />
      </mesh>

      {SQUARES.map((sq) => {
        const x = sq.file - 3.5;
        const z = sq.rank - 3.5;
        const isSelected = selectedSquare === sq.algebraic;
        const isHighlight = highlightSquares.includes(sq.algebraic);
        const isLastMove = lastMoveSquares.includes(sq.algebraic);
        const baseColor = sq.isLight ? theme.lightSquare : theme.darkSquare;

        return (
          <mesh
            key={sq.algebraic}
            position={[x, 0.04, z]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              onSquareClick(sq.algebraic);
            }}
          >
            <planeGeometry args={[0.96, 0.96]} />
            <meshStandardMaterial
              color={
                isSelected
                  ? theme.accent
                  : isHighlight
                    ? "#ff8c42"
                    : isLastMove
                      ? "#ffb347"
                      : baseColor
              }
              roughness={sq.isLight ? 0.62 : 0.78}
              metalness={sq.isLight ? 0.08 : 0.14}
              emissive={
                isSelected || isHighlight
                  ? theme.accent
                  : isLastMove
                    ? "#ffb347"
                    : sq.isLight
                      ? baseColor
                      : "#000000"
              }
              emissiveIntensity={
                isSelected ? 0.25 : isHighlight ? 0.18 : isLastMove ? 0.12 : sq.isLight ? 0.06 : 0
              }
            />
          </mesh>
        );
      })}
    </group>
  );
}
