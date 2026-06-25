import type { Response, NextFunction, Request } from "express";
import { Router } from "express";
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { deriveGlobalConfigPda, deriveTreasuryPda } from "@sol-tictactoe/shared";
import {
  completeGateLogin,
  createGateWalletChallenge,
  getAdminGatePublicConfig,
  verifyGateEmail,
  verifyGateGoogle,
} from "./auth/admin-gate-auth";
import {
  createWalletChallenge,
  loginWithPlatform,
  logoutSession,
} from "./auth/admin-auth";
import {
  requireAdminSession,
  type AdminRequest,
} from "./auth/admin-middleware";
import { getPublicPlatforms } from "./auth/platforms";
import { rateLimit } from "./auth/rate-limit";
import {
  getBankLedger,
  getClientDetail,
  getClientsWithStats,
  getDailyVisits,
  getDbStats,
  getGameModeStats,
  getMatchLog,
  getPlayersPaginated,
  getRecentGames,
  getReceiptsPaginated,
  logAdminAction,
} from "./db";
import { getDatabaseProvider } from "./database";
import {
  clearEscrowDiagnosticsCache,
  getEscrowDiagnostics,
  isEscrowReadyFromDiagnostics,
} from "./escrow-status";
import { getAuthorityPublicKey } from "./escrow-client";
import { config } from "./config";
import idl from "./idl/match_escrow.json";
import {
  parseSolanaCluster,
  sanitizeRpcUrlForClient,
  type SolanaCluster,
} from "./solana-cluster";
import {
  getHouseWalletStatus,
  transferHouseWallet,
  type HouseWalletSource,
} from "./house-wallet";
import { getLivePresenceSnapshot } from "./presence";
import { getRuntimeConfig, updateRuntimeSettings, getModeAvailability } from "./settings";
import { safeApiError } from "./utils/safe-error";

export const adminRouter = Router();

const adminGateConfigRateLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  keyPrefix: "admin-gate-config:",
});

const adminAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  keyPrefix: "admin-auth:",
});

function rejectLegacyAdminAuth(_req: Request, res: Response): boolean {
  if (config.adminLegacyAuthEnabled) return false;
  res.status(404).json({ error: "Not found" });
  return true;
}

adminRouter.get("/auth/gate/config", adminGateConfigRateLimit, (_req, res) => {
  res.json(getAdminGatePublicConfig());
});

adminRouter.use("/auth", adminAuthRateLimit);

adminRouter.post("/auth/gate/email", (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim();
    if (!email) {
      res.status(400).json({ error: "email required" });
      return;
    }
    res.json(verifyGateEmail(email));
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : "Email verification failed",
    });
  }
});

adminRouter.post("/auth/gate/google", async (req, res) => {
  try {
    const flowToken = String(req.body?.flowToken ?? "").trim();
    const idToken = String(req.body?.idToken ?? req.body?.credential ?? "").trim();
    if (!flowToken || !idToken) {
      res.status(400).json({ error: "flowToken and idToken required" });
      return;
    }
    res.json(await verifyGateGoogle(flowToken, idToken));
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : "Google verification failed",
    });
  }
});

adminRouter.post("/auth/gate/challenge", (req, res) => {
  try {
    const flowToken = String(req.body?.flowToken ?? "").trim();
    const wallet = String(req.body?.wallet ?? "").trim();
    if (!flowToken || !wallet) {
      res.status(400).json({ error: "flowToken and wallet required" });
      return;
    }
    res.json(createGateWalletChallenge(flowToken, wallet));
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : "Challenge failed",
    });
  }
});

adminRouter.post("/auth/gate/complete", async (req, res) => {
  try {
    const result = await completeGateLogin({
      flowToken: String(req.body?.flowToken ?? "").trim(),
      wallet: String(req.body?.wallet ?? "").trim(),
      signature: String(req.body?.signature ?? "").trim(),
      nonce: String(req.body?.nonce ?? "").trim(),
    });
    res.json(result);
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : "Login failed",
    });
  }
});

adminRouter.get("/auth/platforms", (req, res) => {
  if (rejectLegacyAdminAuth(req, res)) return;
  res.json({ platforms: getPublicPlatforms() });
});

adminRouter.post("/auth/challenge", (req, res) => {
  if (rejectLegacyAdminAuth(req, res)) return;
  try {
    const wallet = String(req.body?.wallet ?? "").trim();
    if (!wallet) {
      res.status(400).json({ error: "wallet required" });
      return;
    }
    new PublicKey(wallet);
    res.json(createWalletChallenge(wallet));
  } catch {
    res.status(400).json({ error: "Invalid wallet" });
  }
});

adminRouter.post("/auth/login", async (req, res) => {
  if (rejectLegacyAdminAuth(req, res)) return;
  try {
    const result = await loginWithPlatform({
      platformId: String(req.body?.platformId ?? req.body?.platform ?? ""),
      apiKey: req.body?.apiKey,
      wallet: req.body?.wallet,
      signature: req.body?.signature,
      nonce: req.body?.nonce,
    });
    res.json(result);
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : "Login failed",
    });
  }
});

adminRouter.post("/auth/logout", async (req: AdminRequest, res) => {
  const token =
    req.header("Authorization")?.replace(/^Bearer\s+/i, "") ??
    req.header("X-Admin-Session") ??
    "";
  if (token) await logoutSession(token);
  res.json({ ok: true });
});

adminRouter.use(requireAdminSession);

adminRouter.get("/dashboard", async (req: AdminRequest, res) => {
  if (req.query.fresh === "1") {
    clearEscrowDiagnosticsCache();
  }
  const runtime = getRuntimeConfig();
  const stats = await getDbStats();
  const escrow = await getEscrowDiagnostics();
  res.json({
    stats,
    database: { provider: getDatabaseProvider() },
    solanaCluster: runtime.solanaCluster,
    runtime: {
      mockEscrow: runtime.mockEscrow,
      programId: runtime.programId,
      houseRakeBps: runtime.houseRakeBps,
      feeRecipientWallet: runtime.feeRecipientWallet,
      rpcUrl: sanitizeRpcUrlForClient(runtime.rpcUrl, runtime.solanaCluster),
      authority: getAuthorityPublicKey(),
    },
    escrow,
    escrowReady: isEscrowReadyFromDiagnostics(escrow),
    session: req.admin,
  });
});

adminRouter.get("/receipts", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  res.json(await getReceiptsPaginated(limit, offset));
});

adminRouter.get("/players", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  res.json(await getPlayersPaginated(limit, offset));
});

adminRouter.get("/bank", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const matchId =
    typeof req.query.matchId === "string" ? req.query.matchId : undefined;
  res.json(await getBankLedger({ limit, offset, matchId }));
});

adminRouter.get("/match-log", async (req, res) => {
  const matchId =
    typeof req.query.matchId === "string" ? req.query.matchId : undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  res.json({ items: await getMatchLog({ matchId, limit, offset }) });
});

adminRouter.get("/analytics/live", (_req, res) => {
  res.json(getLivePresenceSnapshot());
});

adminRouter.get("/analytics/visits", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 90);
  const items = await getDailyVisits(days);
  const today = new Date().toISOString().slice(0, 10);
  const todayRow = items.find((row) => row.day === today);
  res.json({ items, today: todayRow ?? { day: today, pageViews: 0, uniqueVisitors: 0 } });
});

adminRouter.get("/clients", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const search =
    typeof req.query.search === "string" ? req.query.search : undefined;
  res.json(await getClientsWithStats({ limit, offset, search }));
});

adminRouter.get("/clients/:wallet", async (req, res) => {
  const detail = await getClientDetail(req.params.wallet);
  if (!detail) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(detail);
});

adminRouter.get("/games/stats", async (req, res) => {
  const recentLimit = Math.min(Number(req.query.recentLimit) || 30, 100);
  const [modes, recent] = await Promise.all([
    getGameModeStats(),
    getRecentGames(recentLimit),
  ]);
  res.json({ modes, recent });
});

adminRouter.get("/settings", (_req, res) => {
  const runtime = getRuntimeConfig();
  res.json({
    feeRecipientWallet: runtime.feeRecipientWallet,
    mockEscrow: runtime.mockEscrow,
    houseRakeBps: runtime.houseRakeBps,
    programId: runtime.programId,
    rpcUrl: sanitizeRpcUrlForClient(runtime.rpcUrl, runtime.solanaCluster),
    activeCluster: runtime.solanaCluster,
    authority: getAuthorityPublicKey(),
    gameModeAvailability: getModeAvailability(),
  });
});

adminRouter.put("/settings", async (req: AdminRequest, res) => {
  try {
    const body = req.body as {
      feeRecipientWallet?: string;
      mockEscrow?: boolean;
      houseRakeBps?: number;
      programId?: string;
      activeCluster?: string;
      confirmMainnet?: boolean;
      gameModeAvailability?: Partial<Record<string, string>>;
    };

    if (body.mockEscrow === true && config.isProduction) {
      res.status(400).json({
        error: "mockEscrow cannot be enabled in production",
      });
      return;
    }

    if (body.programId !== undefined && config.isProduction) {
      const trimmed = body.programId.trim();
      if (trimmed && trimmed !== getRuntimeConfig().programId) {
        res.status(400).json({
          error: "programId cannot be changed at runtime in production — redeploy instead",
        });
        return;
      }
    }

    if (body.activeCluster !== undefined && config.isProduction) {
      const next = parseSolanaCluster(body.activeCluster);
      if (next && next !== getRuntimeConfig().solanaCluster) {
        res.status(400).json({
          error: "activeCluster cannot be changed at runtime in production — update env and restart",
        });
        return;
      }
    }

    if (body.activeCluster !== undefined) {
      const next = parseSolanaCluster(body.activeCluster);
      if (!next || next === "testnet") {
        res.status(400).json({ error: "activeCluster must be devnet or mainnet-beta" });
        return;
      }
      const current = getRuntimeConfig().solanaCluster;
      if (
        next === "mainnet-beta" &&
        current !== "mainnet-beta" &&
        body.confirmMainnet !== true
      ) {
        res.status(400).json({
          error: "confirmMainnet is required to switch production network to mainnet",
        });
        return;
      }
    }

    if (
      body.feeRecipientWallet !== undefined &&
      body.feeRecipientWallet.trim()
    ) {
      try {
        new PublicKey(body.feeRecipientWallet.trim());
      } catch {
        res.status(400).json({ error: "feeRecipientWallet inválido" });
        return;
      }
    }

    if (body.programId !== undefined && body.programId.trim()) {
      try {
        new PublicKey(body.programId.trim());
      } catch {
        res.status(400).json({ error: "programId inválido" });
        return;
      }
    }

    const updated = await updateRuntimeSettings({
      feeRecipientWallet: body.feeRecipientWallet,
      mockEscrow: body.mockEscrow,
      houseRakeBps: body.houseRakeBps,
      programId: body.programId,
      activeCluster: body.activeCluster
        ? (parseSolanaCluster(body.activeCluster) as SolanaCluster)
        : undefined,
      gameModeAvailability: body.gameModeAvailability,
    });
    await logAdminAction("settings_update", body, req.admin?.actor);
    res.json({
      ok: true,
      settings: {
        feeRecipientWallet: updated.feeRecipientWallet,
        mockEscrow: updated.mockEscrow,
        houseRakeBps: updated.houseRakeBps,
        programId: updated.programId,
        activeCluster: updated.solanaCluster,
        gameModeAvailability: getModeAvailability(),
      },
    });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Failed to update settings",
    });
  }
});

adminRouter.post("/escrow/init", async (req: AdminRequest, res) => {
  try {
    const runtime = getRuntimeConfig();
    if (!runtime.feeRecipientWallet) {
      res.status(400).json({ error: "Configure feeRecipientWallet primeiro" });
      return;
    }

    const fs = await import("fs");
    const authorityPath = runtime.authorityKeypairPath;
    if (!fs.existsSync(authorityPath)) {
      res.status(400).json({
        error: safeApiError(
          new Error(`Authority keypair não encontrada: ${authorityPath}`),
          "Authority keypair not found on server",
        ),
      });
      return;
    }

    const secret = JSON.parse(
      fs.readFileSync(authorityPath, "utf-8"),
    ) as number[];
    const authority = Keypair.fromSecretKey(Uint8Array.from(secret));
    const connection = new Connection(runtime.rpcUrl, "confirmed");
    const wallet = new anchor.Wallet(authority);
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    const program = new anchor.Program(
      { ...(idl as anchor.Idl), address: runtime.programId },
      provider,
    );

    const [globalConfig] = deriveGlobalConfigPda(runtime.programId);
    const [houseTreasury] = deriveTreasuryPda(runtime.programId);
    const feeRecipient = new PublicKey(runtime.feeRecipientWallet);

    const existing = await connection.getAccountInfo(globalConfig);
    if (existing) {
      res.json({
        ok: true,
        alreadyInitialized: true,
        globalConfig: globalConfig.toBase58(),
      });
      return;
    }

    const sig = await program.methods
      .initializeConfig(runtime.houseRakeBps, feeRecipient, [])
      .accounts({
        authority: authority.publicKey,
        globalConfig,
        houseTreasury,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await logAdminAction("escrow_init", { signature: sig }, req.admin?.actor);
    res.json({
      ok: true,
      signature: sig,
      globalConfig: globalConfig.toBase58(),
      feeRecipient: feeRecipient.toBase58(),
    });
  } catch (err) {
    res.status(500).json({
      error: safeApiError(err, "init-escrow failed"),
    });
  }
});

adminRouter.get("/escrow/status", async (req, res) => {
  if (req.query.fresh === "1") {
    clearEscrowDiagnosticsCache();
  }
  const escrow = await getEscrowDiagnostics();
  res.json({
    escrow,
    escrowReady: isEscrowReadyFromDiagnostics(escrow),
  });
});

adminRouter.get("/wallet/status", async (_req, res) => {
  try {
    res.json(await getHouseWalletStatus());
  } catch (err) {
    res.status(500).json({
      error: safeApiError(err, "Failed to load wallet status"),
    });
  }
});

adminRouter.post("/wallet/transfer", async (req: AdminRequest, res) => {
  try {
    const body = req.body as {
      source?: HouseWalletSource;
      destination?: string;
      amountLamports?: number;
    };
    const source = body.source;
    if (source !== "fee" && source !== "authority" && source !== "treasury") {
      res.status(400).json({ error: "source inválida (fee, authority, treasury)" });
      return;
    }
    if (!body.destination?.trim()) {
      res.status(400).json({ error: "destination obrigatório" });
      return;
    }
    const amountLamports = Number(body.amountLamports);
    if (!Number.isFinite(amountLamports) || amountLamports <= 0) {
      res.status(400).json({ error: "amountLamports inválido" });
      return;
    }

    const result = await transferHouseWallet({
      source,
      destination: body.destination.trim(),
      amountLamports: Math.floor(amountLamports),
      actor: req.admin?.actor,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({
      error: safeApiError(err, "Transfer failed"),
    });
  }
});
