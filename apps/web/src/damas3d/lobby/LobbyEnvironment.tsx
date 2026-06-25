import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DOPAMINE } from "./dopamineColors";

const COUNT = 220;

export function LobbyParticles() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 48;
      arr[i * 3 + 1] = Math.random() * 16 - 5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.015;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        color={DOPAMINE.sky}
        transparent
        opacity={0.75}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function LobbyFloor({ compact = false }: { compact?: boolean }) {
  return (
    <group position={[0, compact ? -2.65 : -2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow>
        <circleGeometry args={[24, 64]} />
        <meshStandardMaterial
          color={DOPAMINE.navy}
          emissive={DOPAMINE.electric}
          emissiveIntensity={0.22}
          metalness={0.65}
          roughness={0.38}
        />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[5, 24, 64]} />
        <meshBasicMaterial
          color={DOPAMINE.cyan}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* grid radial */}
      <mesh position={[0, 0, 0.02]}>
        <ringGeometry args={[4, 24, 32]} />
        <meshBasicMaterial
          color={DOPAMINE.sky}
          wireframe
          transparent
          opacity={0.06}
        />
      </mesh>
    </group>
  );
}
