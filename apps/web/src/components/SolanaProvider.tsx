import { useMemo, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { ClusterProvider, useCluster } from "../hooks/useCluster";
import { createSolanaWalletAdapters } from "../config/solanaWallets";
import { ServerClusterSync } from "./ServerClusterSync";

function SolanaConnection({
  children,
  autoConnect,
  localStorageKey = "sol-ttt-wallet",
}: {
  children: ReactNode;
  autoConnect: boolean;
  localStorageKey?: string;
}) {
  const { rpcUrl } = useCluster();
  const endpoint = useMemo(() => rpcUrl, [rpcUrl]);
  const wallets = useMemo(() => createSolanaWalletAdapters(), []);

  return (
    <ConnectionProvider endpoint={endpoint} key={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={autoConnect}
        localStorageKey={localStorageKey}
      >
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function SolanaProvider({
  children,
  autoConnect = true,
  localStorageKey,
}: {
  children: ReactNode;
  autoConnect?: boolean;
  localStorageKey?: string;
}) {
  return (
    <ClusterProvider>
      <ServerClusterSync />
      <SolanaConnection
        autoConnect={autoConnect}
        localStorageKey={localStorageKey}
      >
        {children}
      </SolanaConnection>
    </ClusterProvider>
  );
}
