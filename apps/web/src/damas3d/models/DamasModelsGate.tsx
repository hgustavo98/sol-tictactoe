import type { ReactNode } from "react";

/** GLTF models not used — checkers pieces are procedural cylinders. */
export function DamasModelsGate({ children }: { children: ReactNode }) {
  return children;
}

export function preloadDamasModels(): void {
  /* no-op */
}
