import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SolanaCluster } from "../config/tokens";

const CLUSTER_KEY = "sol-ttt-cluster";

const RPC_BY_CLUSTER: Record<SolanaCluster, string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

const ESCROW_CLUSTERS: SolanaCluster[] = ["devnet", "mainnet-beta"];

function defaultCluster(): SolanaCluster {
  const envDefault = import.meta.env.VITE_DEFAULT_CLUSTER as string | undefined;
  if (
    envDefault === "devnet" ||
    envDefault === "testnet" ||
    envDefault === "mainnet-beta"
  ) {
    return envDefault;
  }
  return "devnet";
}

function readStoredCluster(): SolanaCluster {
  if (typeof localStorage === "undefined") return defaultCluster();
  const stored = localStorage.getItem(CLUSTER_KEY);
  if (stored === "devnet" || stored === "testnet" || stored === "mainnet-beta") {
    return stored;
  }
  return defaultCluster();
}

function rpcOverrideForCluster(cluster: SolanaCluster): string | undefined {
  if (cluster === "mainnet-beta") {
    return (
      (import.meta.env.VITE_MAINNET_RPC_URL as string | undefined)?.trim() ||
      (import.meta.env.VITE_RPC_URL as string | undefined)?.trim() ||
      undefined
    );
  }
  if (cluster === "devnet") {
    return (import.meta.env.VITE_DEVNET_RPC_URL as string | undefined)?.trim() ||
      (import.meta.env.VITE_RPC_URL as string | undefined)?.trim() ||
      undefined;
  }
  return undefined;
}

interface ClusterContextValue {
  cluster: SolanaCluster;
  rpcUrl: string;
  bindToServer: (cluster: SolanaCluster, rpcUrl: string) => void;
  serverLocked: boolean;
  isDevnet: boolean;
  isMainnet: boolean;
  supportsEscrow: boolean;
}

const ClusterContext = createContext<ClusterContextValue | null>(null);

export function ClusterProvider({ children }: { children: ReactNode }) {
  const [cluster, setClusterState] = useState<SolanaCluster>(readStoredCluster);
  const [serverBinding, setServerBinding] = useState<{
    cluster: SolanaCluster;
    rpcUrl: string;
  } | null>(null);

  const bindToServer = useCallback((next: SolanaCluster, rpcUrl: string) => {
    setServerBinding({ cluster: next, rpcUrl });
    setClusterState(next);
    localStorage.setItem(CLUSTER_KEY, next);
  }, []);

  const effectiveCluster = serverBinding?.cluster ?? cluster;

  const rpcUrl = useMemo(() => {
    if (serverBinding?.rpcUrl) return serverBinding.rpcUrl;
    const override = rpcOverrideForCluster(effectiveCluster);
    if (override) return override;
    return RPC_BY_CLUSTER[effectiveCluster];
  }, [effectiveCluster, serverBinding]);

  const value = useMemo(
    () => ({
      cluster: effectiveCluster,
      rpcUrl,
      bindToServer,
      serverLocked: serverBinding != null,
      isDevnet: effectiveCluster === "devnet",
      isMainnet: effectiveCluster === "mainnet-beta",
      supportsEscrow: ESCROW_CLUSTERS.includes(effectiveCluster),
    }),
    [effectiveCluster, rpcUrl, bindToServer, serverBinding],
  );

  return (
    <ClusterContext.Provider value={value}>{children}</ClusterContext.Provider>
  );
}

export function useCluster() {
  const ctx = useContext(ClusterContext);
  if (!ctx) throw new Error("useCluster must be used within ClusterProvider");
  return ctx;
}
