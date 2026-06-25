import { Connection, PublicKey } from "@solana/web3.js";
import {
  deriveGlobalConfigPda,
  deriveTreasuryPda,
  isValidSolanaAddress,
} from "@sol-tictactoe/shared";
import { getAuthorityPublicKey } from "./escrow-client";
import { getRuntimeConfig } from "./settings";
import { clusterLabel, sanitizeRpcUrlForClient, type SolanaCluster } from "./solana-cluster";

export interface EscrowDiagnostics {
  mockEscrowOff: boolean;
  feeRecipientSet: boolean;
  programIdSet: boolean;
  programIdValid: boolean;
  programDeployed: boolean;
  globalConfigInitialized: boolean;
  authorityFunded: boolean;
  authorityBalanceLamports: number;
  feeRecipient: string;
  authority: string;
  programId: string;
  globalConfigPda: string;
  houseTreasuryPda: string;
  rpcUrl: string;
  rpcReachable: boolean;
  missingSteps: string[];
}

const DIAGNOSTICS_CACHE_MS = 45_000;
let diagnosticsCache: { at: number; value: EscrowDiagnostics } | null = null;

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRpcRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [0, 600, 1800];
  let lastErr: unknown;
  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err)) throw err;
    }
  }
  throw lastErr;
}

export async function getEscrowDiagnostics(): Promise<EscrowDiagnostics> {
  if (
    diagnosticsCache &&
    Date.now() - diagnosticsCache.at < DIAGNOSTICS_CACHE_MS
  ) {
    return diagnosticsCache.value;
  }

  const runtime = getRuntimeConfig();
  const network = clusterLabel(runtime.solanaCluster ?? "devnet");
  let authority = "";
  try {
    authority = getAuthorityPublicKey();
  } catch {
    authority = "";
  }
  const feeRecipient = runtime.feeRecipientWallet || authority;
  const programIdValid = isValidSolanaAddress(runtime.programId);

  const missingSteps: string[] = [];
  if (runtime.mockEscrow) {
    missingSteps.push("Desative mock escrow (MOCK_ESCROW=false ou painel admin)");
  }
  if (!authority) {
    missingSteps.push(
      "Configure AUTHORITY_KEYPAIR_PATH (keypair da authority do programa)",
    );
  }
  if (!feeRecipient) {
    missingSteps.push("Configure FEE_RECIPIENT_WALLET (carteira que recebe taxas)");
  }
  if (!runtime.programId) {
    missingSteps.push("Configure PROGRAM_ID do programa deployado");
  } else if (!programIdValid) {
    missingSteps.push("Configure PROGRAM_ID válido (endereço Solana base58)");
  }

  let globalConfigPdaStr = "";
  let houseTreasuryPdaStr = "";
  let programDeployed = false;
  let globalConfigInitialized = false;
  let authorityBalanceLamports = 0;
  let rpcReachable = true;

  if (programIdValid && authority) {
    try {
      const [globalConfigPda] = deriveGlobalConfigPda(runtime.programId);
      const [houseTreasuryPda] = deriveTreasuryPda(runtime.programId);
      globalConfigPdaStr = globalConfigPda.toBase58();
      houseTreasuryPdaStr = houseTreasuryPda.toBase58();

      const connection = new Connection(runtime.rpcUrl, "confirmed");
      const programPk = new PublicKey(runtime.programId);
      const authorityPk = new PublicKey(authority);

      const [programInfo, globalInfo, balance] = await withRpcRetry(() =>
        Promise.all([
          connection.getAccountInfo(programPk),
          connection.getAccountInfo(globalConfigPda),
          connection.getBalance(authorityPk),
        ]),
      );

      programDeployed = Boolean(programInfo?.executable);
      if (!programDeployed) {
        missingSteps.push(
          `Deploy do programa Anchor na ${network} (anchor deploy)`,
        );
      }

      globalConfigInitialized = Boolean(globalInfo);
      if (!globalConfigInitialized && programDeployed) {
        missingSteps.push(
          "Execute init-escrow (npm run init-escrow -w @sol-tictactoe/server)",
        );
      }

      authorityBalanceLamports = balance;
      if (authorityBalanceLamports < 10_000_000) {
        missingSteps.push(
          `Financie a authority com SOL na ${network} (≥0.01 SOL)`,
        );
      }
    } catch (err) {
      rpcReachable = false;
      if (isRateLimitError(err)) {
        missingSteps.push(
          `RPC ${network} com rate limit (429) — aguarde e clique Atualizar, ou configure RPC_URL com endpoint dedicado (Helius, QuickNode, etc.)`,
        );
      } else {
        missingSteps.push(
          `Erro ao consultar RPC: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }
  }

  const value: EscrowDiagnostics = {
    mockEscrowOff: !runtime.mockEscrow,
    feeRecipientSet: Boolean(feeRecipient),
    programIdSet: Boolean(runtime.programId),
    programIdValid,
    programDeployed,
    globalConfigInitialized,
    authorityFunded: authorityBalanceLamports >= 10_000_000,
    authorityBalanceLamports,
    feeRecipient,
    authority,
    programId: runtime.programId,
    globalConfigPda: globalConfigPdaStr,
    houseTreasuryPda: houseTreasuryPdaStr,
    rpcUrl: runtime.rpcUrl,
    rpcReachable,
    missingSteps,
  };

  diagnosticsCache = { at: Date.now(), value };
  return value;
}

export function clearEscrowDiagnosticsCache(): void {
  diagnosticsCache = null;
}

/** Strip provider RPC keys before sending diagnostics to browsers. */
export function publicEscrowDiagnostics(
  diagnostics: EscrowDiagnostics,
  cluster: SolanaCluster,
): EscrowDiagnostics {
  return {
    ...diagnostics,
    rpcUrl: sanitizeRpcUrlForClient(diagnostics.rpcUrl, cluster),
  };
}

export function isEscrowReadyFromDiagnostics(d: EscrowDiagnostics): boolean {
  return (
    d.mockEscrowOff &&
    d.feeRecipientSet &&
    d.programIdSet &&
    d.rpcReachable &&
    d.programDeployed &&
    d.globalConfigInitialized &&
    d.authorityFunded
  );
}
