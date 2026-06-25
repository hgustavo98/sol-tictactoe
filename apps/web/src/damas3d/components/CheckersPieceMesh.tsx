import type { ThreeEvent } from "@react-three/fiber";
import type { PieceKind, PieceMaterialTheme } from "../types";

interface CheckersPieceMeshProps {
  kind: PieceKind;
  material: PieceMaterialTheme;
  selected?: boolean;
  castShadow?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

export function CheckersPieceMesh({
  kind,
  material,
  selected,
  castShadow,
  onClick,
}: CheckersPieceMeshProps) {
  const isKing = kind === "k";
  const y = isKing ? 0.22 : 0.18;
  const radius = isKing ? 0.32 : 0.34;
  const height = isKing ? 0.14 : 0.12;

  return (
    <group onClick={onClick}>
      <mesh position={[0, y, 0]} castShadow={castShadow} receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.05, height, 32]} />
        <meshStandardMaterial
          color={material.color}
          metalness={material.metalness}
          roughness={material.roughness}
          emissive={selected ? material.emissive ?? "#ff4757" : material.emissive}
          emissiveIntensity={
            selected ? 0.45 : material.emissiveIntensity ?? 0
          }
        />
      </mesh>
      {isKing && (
        <mesh position={[0, y + height * 0.55, 0]} castShadow={castShadow}>
          <torusGeometry args={[0.18, 0.04, 12, 24]} />
          <meshStandardMaterial
            color="#ffb347"
            metalness={0.85}
            roughness={0.2}
            emissive="#ff6b35"
            emissiveIntensity={0.35}
          />
        </mesh>
      )}
    </group>
  );
}
