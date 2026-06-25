import type { PublicAppConfig, PublicEscrowDiagnostics } from "@sol-tictactoe/shared";
import { getAllowedMints } from "./escrow-client";
import {
  type EscrowDiagnostics,
  isEscrowReadyFromDiagnostics,
} from "./escrow-status";
import { config } from "./config";
import { getRuntimeConfig, getModeAvailability } from "./settings";
import { sanitizeRpcUrlForClient, type SolanaCluster } from "./solana-cluster";

export function toPublicEscrowDiagnostics(
  diagnostics: EscrowDiagnostics,
): PublicEscrowDiagnostics {
  return {
    mockEscrowOff: diagnostics.mockEscrowOff,
    feeRecipientSet: diagnostics.feeRecipientSet,
    programIdSet: diagnostics.programIdSet,
    programIdValid: diagnostics.programIdValid,
    programDeployed: diagnostics.programDeployed,
    globalConfigInitialized: diagnostics.globalConfigInitialized,
    authorityFunded: diagnostics.authorityFunded,
    rpcReachable: diagnostics.rpcReachable,
    missingSteps: diagnostics.missingSteps,
  };
}

export function buildPublicAppConfig(
  escrowDiagnostics: EscrowDiagnostics,
  cluster: SolanaCluster,
): PublicAppConfig {
  const runtime = getRuntimeConfig();
  return {
    houseRakeBps: runtime.houseRakeBps,
    programId: runtime.programId,
    rpcUrl: sanitizeRpcUrlForClient(runtime.rpcUrl, cluster),
    solanaCluster: cluster,
    clusterLocked: config.isProduction,
    allowedMints: getAllowedMints(),
    mockEscrow: runtime.mockEscrow,
    escrowReady: isEscrowReadyFromDiagnostics(escrowDiagnostics),
    escrowDiagnostics: toPublicEscrowDiagnostics(escrowDiagnostics),
    gameModeAvailability: getModeAvailability(),
  };
}
