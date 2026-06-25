import type { SolanaCluster } from "./tokens";
import {
  clusterExplorerParam,
  explorerAddressUrl,
  explorerTxUrl,
  getExplorerCluster,
} from "./tokens";

export const API_URL = import.meta.env.VITE_API_URL ?? "";

export const BET_PRESETS_SOL = [0.05, 0.075, 0.1, 0.25, 0.5, 1.0];

/** @deprecated Use explorerTxUrl from tokens.ts */
export const EXPLORER_TX = (sig: string, cluster?: SolanaCluster) =>
  explorerTxUrl(sig, cluster ?? getExplorerCluster());

/** @deprecated Use explorerAddressUrl from tokens.ts */
export const EXPLORER_ADDRESS = (addr: string, cluster?: SolanaCluster) =>
  explorerAddressUrl(addr, cluster ?? getExplorerCluster());

export { clusterExplorerParam, explorerAddressUrl, explorerTxUrl };
