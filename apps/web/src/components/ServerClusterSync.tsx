import { useEffect } from "react";
import { useAppConfig } from "../hooks/useWalletData";
import { useCluster } from "../hooks/useCluster";
import type { SolanaCluster } from "../config/tokens";

function clientRpcOverride(cluster: SolanaCluster): string | undefined {
  if (cluster === "mainnet-beta") {
    return (
      (import.meta.env.VITE_MAINNET_RPC_URL as string | undefined)?.trim() ||
      (import.meta.env.VITE_RPC_URL as string | undefined)?.trim() ||
      undefined
    );
  }
  if (cluster === "devnet") {
    return (
      (import.meta.env.VITE_DEVNET_RPC_URL as string | undefined)?.trim() ||
      (import.meta.env.VITE_RPC_URL as string | undefined)?.trim() ||
      undefined
    );
  }
  return undefined;
}

/** Keeps the wallet connection aligned with the server's active Solana cluster. */
export function ServerClusterSync() {
  const { config, loading } = useAppConfig();
  const { bindToServer } = useCluster();

  useEffect(() => {
    if (loading || !config?.solanaCluster || !config.rpcUrl) return;
    const cluster = config.solanaCluster as SolanaCluster;
    const rpcUrl = clientRpcOverride(cluster) ?? config.rpcUrl;
    bindToServer(cluster, rpcUrl);
  }, [bindToServer, config, loading]);

  return null;
}
