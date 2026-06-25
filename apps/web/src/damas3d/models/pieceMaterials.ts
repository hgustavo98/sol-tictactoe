import * as THREE from "three";
import type { PieceMaterialTheme } from "../types";
import { detectChessRendererTier } from "../utils/rendererProfile";

const cache = new Map<string, THREE.MeshStandardMaterial>();

function cacheKey(
  kind: string,
  color: string,
  material: PieceMaterialTheme,
  selected: boolean,
): string {
  return [
    kind,
    color,
    material.color,
    material.metalness,
    material.roughness,
    material.emissive ?? "",
    material.emissiveIntensity ?? "",
    selected ? "sel" : "idle",
  ].join("|");
}

export function clearPieceMaterialCache(): void {
  for (const mat of cache.values()) {
    mat.dispose();
  }
  cache.clear();
}

export function getPieceMaterial(
  kind: string,
  color: string,
  material: PieceMaterialTheme,
  selected: boolean,
): THREE.MeshStandardMaterial {
  const key = cacheKey(kind, color, material, selected);
  const existing = cache.get(key);
  if (existing) return existing;

  const lowTier = detectChessRendererTier() === "low";
  const metalness =
    lowTier && !material.emissive
      ? Math.min(material.metalness, 0.4)
      : material.metalness;

  const mat = new THREE.MeshStandardMaterial({
    color: material.color,
    metalness,
    roughness: material.roughness,
    emissive: selected
      ? "#733535"
      : material.emissive
        ? new THREE.Color(material.emissive)
        : "#000000",
    emissiveIntensity: selected
      ? 0.35
      : material.emissive
        ? (material.emissiveIntensity ?? 0.35)
        : 0,
    envMapIntensity: material.emissive ? 0.25 : 0.12,
  });
  cache.set(key, mat);
  return mat;
}
