export type SolanaCluster = "devnet" | "testnet" | "mainnet-beta";

const PRODUCTION_CLUSTERS: SolanaCluster[] = ["devnet", "mainnet-beta"];

export function parseSolanaCluster(value: string | undefined): SolanaCluster | null {
  const normalized = value?.trim();
  if (
    normalized === "devnet" ||
    normalized === "testnet" ||
    normalized === "mainnet-beta"
  ) {
    return normalized;
  }
  return null;
}

export function isProductionCluster(value: SolanaCluster): boolean {
  return PRODUCTION_CLUSTERS.includes(value);
}

export function inferSolanaCluster(
  rpcUrl: string,
  launchCluster?: string,
): SolanaCluster {
  const normalized = launchCluster?.trim();
  if (
    normalized === "devnet" ||
    normalized === "testnet" ||
    normalized === "mainnet-beta"
  ) {
    return normalized;
  }
  const lower = rpcUrl.toLowerCase();
  if (lower.includes("devnet")) return "devnet";
  if (lower.includes("testnet")) return "testnet";
  return "mainnet-beta";
}

export function clusterLabel(cluster: SolanaCluster): string {
  if (cluster === "mainnet-beta") return "mainnet";
  return cluster;
}

const PUBLIC_RPC: Record<SolanaCluster, string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

const SENSITIVE_RPC_QUERY_KEYS = [
  "api-key",
  "api_key",
  "apikey",
  "token",
  "key",
  "secret",
];

/** RPC URL safe to expose to browsers (no provider API keys). */
export function sanitizeRpcUrlForClient(
  rpcUrl: string,
  cluster: SolanaCluster,
): string {
  const fallback = PUBLIC_RPC[cluster] ?? PUBLIC_RPC["mainnet-beta"];
  try {
    const url = new URL(rpcUrl);
    let stripped = false;
    for (const param of SENSITIVE_RPC_QUERY_KEYS) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        stripped = true;
      }
    }
    if (stripped) {
      return url.search ? url.toString() : fallback;
    }
    if (/helius|quicknode|alchemy|triton/i.test(url.hostname) && url.search) {
      return fallback;
    }
    return rpcUrl;
  } catch {
    return fallback;
  }
}
