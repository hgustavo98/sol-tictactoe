import { useMemo } from "react";
import { useAppConfig } from "./useWalletData";
import { useCluster } from "./useCluster";
import type { SolanaCluster } from "../config/tokens";

/** True when server + program are configured for real on-chain escrow. */
export function useEscrowMode() {
  const { config, loading: configLoading, error: configError } = useAppConfig();
  const { cluster, supportsEscrow } = useCluster();

  return useMemo(() => {
    const configReady = !configLoading && config != null;
    const mockEscrow = config?.mockEscrow === true;
    const programId = config?.programId;
    const serverReady = config?.escrowReady === true;
    const diagnostics = config?.escrowDiagnostics;
    const feeRecipientSet = diagnostics?.feeRecipientSet === true;
    const serverCluster = config?.solanaCluster as SolanaCluster | undefined;
    const clusterLocked = config?.clusterLocked === true;
    const clusterAligned =
      !serverCluster || serverCluster === cluster;
    const escrowEnabled =
      configReady &&
      serverReady &&
      !mockEscrow &&
      Boolean(programId) &&
      feeRecipientSet &&
      supportsEscrow &&
      clusterAligned;

    /** Paid tables must go on-chain when the server is not in mock mode. */
    const requiresOnChainPayment = configReady && !mockEscrow && serverReady;

    return {
      escrowEnabled,
      mockEscrow,
      configReady,
      configLoading,
      configError,
      requiresOnChainPayment,
      programId: programId ?? import.meta.env.VITE_PROGRAM_ID,
      feeRecipientSet,
      cluster,
      serverCluster,
      clusterAligned,
      clusterLocked,
      escrowDiagnostics: diagnostics,
      missingSteps: diagnostics?.missingSteps ?? [],
    };
  }, [config, configLoading, configError, cluster, supportsEscrow]);
}
