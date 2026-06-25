import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
import {
  ContactShadows,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import type { BoardOrientation } from "../types";
import { useChessCameraConfig } from "../cameraConfig";
import { useDamasCustomization } from "../hooks/useDamasCustomization";
import { useContainerReady } from "../hooks/useContainerReady";
import {
  chessRendererProfile,
  detectChessRendererTier,
  type ChessRendererTier,
} from "../utils/rendererProfile";
import { Board3D } from "./Board3D";
import { PiecesLayer3D } from "./PiecesLayer3D";
import { SafeSceneEnvironment } from "./SafeSceneEnvironment";

interface DamasScene3DProps {
  fen: string;
  orientation: BoardOrientation;
  selectedSquare: string | null;
  highlightSquares: string[];
  lastMoveSquares: string[];
  interactive: boolean;
  onSquareClick: (square: string) => void;
  onPieceClick: (square: string) => void;
}

function DamasBoardScene({
  fen,
  orientation,
  selectedSquare,
  highlightSquares,
  lastMoveSquares,
  onSquareClick,
  onPieceClick,
  profile,
}: Omit<DamasScene3DProps, "interactive"> & {
  profile: ReturnType<typeof chessRendererProfile>;
}) {
  const { boardTheme, pieceSet } = useDamasCustomization();
  const camera = useChessCameraConfig();
  const cameraTarget = useMemo(() => [0, 0, 0] as [number, number, number], []);
  const boardRotation = useMemo(
    () => [0, orientation === "black" ? Math.PI : 0, 0] as [number, number, number],
    [orientation],
  );

  return (
    <>
      <PerspectiveCamera makeDefault position={camera.position} fov={camera.fov} />
      <OrbitControls
        target={cameraTarget}
        enablePan={false}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={camera.minDistance}
        maxDistance={camera.maxDistance}
      />

      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow={profile.directionalShadows}
        intensity={1.1}
        position={[6, 10, 4]}
        shadow-mapSize={[profile.shadowMapSize, profile.shadowMapSize]}
      />
      <pointLight intensity={0.35} position={[-4, 6, -3]} color="#e63946" />
      <pointLight intensity={0.25} position={[4, 4, 5]} color="#ff8c42" />

      <group rotation={boardRotation}>
        <Board3D
          theme={boardTheme}
          selectedSquare={selectedSquare}
          highlightSquares={highlightSquares}
          lastMoveSquares={lastMoveSquares}
          onSquareClick={onSquareClick}
        />
        <PiecesLayer3D
          fen={fen}
          pieceSet={pieceSet}
          selectedSquare={selectedSquare}
          onPieceClick={onPieceClick}
          pieceCastShadow={profile.pieceCastShadow}
        />
      </group>

      {profile.contactShadows ? (
        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={0.45}
          scale={12}
          blur={2}
          far={8}
          resolution={256}
          frames={1}
        />
      ) : null}

      {profile.environment ? (
        <Suspense fallback={null}>
          <SafeSceneEnvironment />
        </Suspense>
      ) : null}
    </>
  );
}

export function DamasScene3D(props: DamasScene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerReady = useContainerReady(containerRef);
  const [canvasKey, setCanvasKey] = useState(0);
  const [tier, setTier] = useState<ChessRendererTier>(() =>
    detectChessRendererTier(),
  );
  const profile = useMemo(() => chessRendererProfile(tier), [tier]);

  const onCanvasCreated = useCallback(
    ({ gl }: RootState) => {
      gl.shadowMap.enabled = profile.directionalShadows;
      gl.shadowMap.type = THREE.PCFShadowMap;

      const canvas = gl.domElement;
      const onContextLost = (event: Event) => {
        event.preventDefault();
        setTier((current) => (current === "high" ? "low" : current));
        window.setTimeout(() => setCanvasKey((key) => key + 1), 0);
      };
      canvas.addEventListener("webglcontextlost", onContextLost, false);
    },
    [profile.directionalShadows],
  );

  return (
    <div ref={containerRef} className="damas3d-canvas-host">
      {containerReady ? (
        <Canvas
          key={`${canvasKey}-${tier}`}
          shadows={profile.directionalShadows}
          className="damas3d-canvas"
          style={{ width: "100%", height: "100%", minHeight: "16rem" }}
          gl={{
            antialias: profile.antialias,
            alpha: true,
            powerPreference: "high-performance",
            stencil: false,
          }}
          dpr={profile.dpr}
          resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
          onCreated={onCanvasCreated}
        >
          <DamasBoardScene
            fen={props.fen}
            orientation={props.orientation}
            selectedSquare={props.selectedSquare}
            highlightSquares={props.highlightSquares}
            lastMoveSquares={props.lastMoveSquares}
            onSquareClick={props.onSquareClick}
            onPieceClick={props.onPieceClick}
            profile={profile}
          />
        </Canvas>
      ) : null}
    </div>
  );
}
