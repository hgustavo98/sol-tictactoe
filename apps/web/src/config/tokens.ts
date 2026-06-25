import { PublicKey } from "@solana/web3.js";
import type { TokenInfo } from "@sol-tictactoe/shared";
import { NATIVE_SOL_MINT } from "@sol-tictactoe/shared";
import { getApiBase } from "./apiBase";

export { getApiBase } from "./apiBase";

/** @deprecated Prefer getApiBase() — empty string may be baked in at build without VITE_API_URL. */
export const API_BASE = getApiBase();

export type SolanaCluster = "devnet" | "testnet" | "mainnet-beta";

export function clusterExplorerParam(cluster: SolanaCluster): string {
  if (cluster === "mainnet-beta") return "";
  return `?cluster=${cluster}`;
}

export function getProgramId(): string {
  return (
    import.meta.env.VITE_PROGRAM_ID ??
    "ChessEscrw1111111111111111111111111111111"
  );
}

export function getExplorerCluster(): SolanaCluster {
  if (typeof localStorage === "undefined") return "devnet";
  const stored = localStorage.getItem("sol-ttt-cluster");
  if (stored === "devnet" || stored === "testnet" || stored === "mainnet-beta") {
    return stored;
  }
  return "devnet";
}

export function getSolanaCluster(): SolanaCluster {
  return getExplorerCluster();
}

export function explorerTxUrl(sig: string, cluster?: SolanaCluster): string {
  const c = cluster ?? getExplorerCluster();
  return `https://explorer.solana.com/tx/${sig}${clusterExplorerParam(c)}`;
}

export function explorerAddressUrl(addr: string, cluster?: SolanaCluster): string {
  const c = cluster ?? getExplorerCluster();
  return `https://explorer.solana.com/address/${addr}${clusterExplorerParam(c)}`;
}

export const EXPLORER_TX = explorerTxUrl;
export const EXPLORER_ADDRESS = explorerAddressUrl;

/** True for base58 Solana addresses (excludes mock escrow ids). */
export function isOnChainAddress(addr: string): boolean {
  if (!addr || addr.startsWith("mock_")) return false;
  try {
    new PublicKey(addr);
    return true;
  } catch {
    return false;
  }
}

export const BET_PRESETS_SOL = [0.1, 0.25, 0.5, 1];

const envMints = (import.meta.env.VITE_ALLOWED_MINTS ?? "")
  .split(",")
  .map((m: string) => m.trim())
  .filter(Boolean);

export function getAllowedTokens(serverMints: string[] = []): TokenInfo[] {
  const sol: TokenInfo = {
    mint: NATIVE_SOL_MINT,
    symbol: "SOL",
    decimals: 9,
    name: "Solana",
  };

  const mints = [...new Set([...serverMints, ...envMints])];
  const spl = mints.map((mint) => ({
    mint,
    symbol: `${mint.slice(0, 4)}…`,
    decimals: 6,
    name: "SPL Token",
  }));

  return [sol, ...spl];
}

export function getAllowedTokensFromConfig(serverMints: string[]): TokenInfo[] {
  return getAllowedTokens(serverMints);
}

export function isSplMint(mint: string): boolean {
  return mint !== NATIVE_SOL_MINT;
}

export { NATIVE_SOL_MINT };
