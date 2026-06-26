import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { SOCKET_EVENTS } from "@sol-tictactoe/shared";
import { adminRouter } from "./admin-routes";
import { config } from "./config";
import { connectDatabase, getDatabaseProvider } from "./database";
import { getReceiptsForWallet, getOrCreatePlayer, getPlayerProfile, recordSiteVisit } from "./db";
import {
  getPlayerProfilesBatch,
  ProfileUpdateError,
  searchPlayers,
  updatePlayerProfile,
} from "./player-profile";
import {
  getEscrowDiagnostics,
} from "./escrow-status";
import { getFeeRecipientPublicKey } from "./escrow-client";
import { registerSocketHandlers } from "./socket-handlers";
import { botManager } from "./bot-manager";
import { matchManager } from "./match-manager";
import { getRuntimeConfig, seedSettingsFromEnv } from "./settings";
import { playerAuthRouter } from "./player-auth-routes";
import {
  optionalPlayerSession,
  requirePlayerSession,
  type PlayerAuthRequest,
} from "./auth/player-middleware";
import { registerSocketAuth } from "./auth/socket-auth";
import { rateLimit } from "./auth/rate-limit";
import { securityHeaders } from "./auth/security-headers";
import { runProductionStartupChecks } from "./startup-checks";
import { buildPublicAppConfig } from "./public-config";
import { toPublicPlayerProfile, toPublicPlayerProfiles } from "./public-player";

const visitRateLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  keyPrefix: "visit:",
});

const playersReadRateLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  keyPrefix: "players:",
});

async function bootstrap() {
  runProductionStartupChecks();
  await connectDatabase();
  await seedSettingsFromEnv();

  const app = express();
  if (config.trustProxy) {
    app.set("trust proxy", true);
  }
  app.use(securityHeaders);
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "300kb" }));

  app.get("/health", (_req, res) => {
    if (config.isProduction) {
      res.json({ ok: true });
      return;
    }
    res.json({
      ok: true,
      service: "sol-ttt-server",
      database: getDatabaseProvider(),
    });
  });

  const api = express.Router();

  api.get("/config", async (_req, res) => {
    const runtime = getRuntimeConfig();
    const escrowDiagnostics = await getEscrowDiagnostics();
    res.json(
      buildPublicAppConfig(
        escrowDiagnostics,
        runtime.solanaCluster ?? config.solanaCluster,
      ),
    );
  });

  api.get("/receipts/mine", requirePlayerSession, async (req: PlayerAuthRequest, res) => {
    const wallet = req.player!.wallet;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    res.json(await getReceiptsForWallet(wallet, limit));
  });

  api.post("/analytics/ping", visitRateLimit, async (req, res) => {
    const visitorId = String(req.body?.visitorId ?? "").trim();
    if (!visitorId || visitorId.length > 64) {
      res.status(400).json({ error: "visitorId required" });
      return;
    }
    try {
      await recordSiteVisit(visitorId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to record visit",
      });
    }
  });

  api.get("/players/search", playersReadRateLimit, async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      res.status(400).json({ error: "query_too_short", message: "Min 2 characters" });
      return;
    }
    const limit = Math.min(Number(req.query.limit) || 20, 25);
    res.json(toPublicPlayerProfiles(await searchPlayers(q, limit)));
  });

  api.get("/players/batch", playersReadRateLimit, async (req, res) => {
    const raw = String(req.query.wallets ?? "");
    const wallets = raw
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);
    if (wallets.length === 0) {
      res.status(400).json({ error: "wallets_required" });
      return;
    }
    if (wallets.length > 15) {
      res.status(400).json({ error: "too_many_wallets", max: 15 });
      return;
    }
    res.json(toPublicPlayerProfiles(await getPlayerProfilesBatch(wallets)));
  });

  api.get("/players/:wallet", playersReadRateLimit, async (req, res) => {
    const wallet = String(req.params.wallet);
    const profile = await getPlayerProfile(wallet);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(toPublicPlayerProfile(profile));
  });

  api.use("/auth", playerAuthRouter);
  api.use("/admin", adminRouter);

  app.use(api);
  app.use("/api", api);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: config.corsOrigins },
  });

  registerSocketAuth(io);

  api.patch(
    "/players/:wallet/profile",
    optionalPlayerSession,
    async (req: PlayerAuthRequest, res) => {
    const wallet = String(req.params.wallet);
    if (config.requirePlayerAuth) {
      if (!req.player || req.player.wallet !== wallet) {
        res.status(403).json({
          error: "forbidden",
          message: "Sign in with this wallet to edit the profile",
        });
        return;
      }
    }
    try {
      const profile = await updatePlayerProfile(wallet, {
        nickname: req.body?.nickname,
        avatarUrl: req.body?.avatarUrl,
      });
      io.emit(SOCKET_EVENTS.PLAYER_PROFILE_UPDATE, toPublicPlayerProfile(profile));
      res.json(toPublicPlayerProfile(profile));
    } catch (e) {
      if (e instanceof ProfileUpdateError) {
        res.status(400).json({ error: e.code, message: e.message });
        return;
      }
      throw e;
    }
  },
  );

  registerSocketHandlers(io);

  const recovered = await matchManager.recoverFromDatabase();
  if (recovered.lobbies > 0 || recovered.games > 0) {
    console.log(
      `[recovery] restored ${recovered.lobbies} lobbies and ${recovered.games} active games from MongoDB`,
    );
  }

  void botManager.start().catch((err) => {
    console.error("[bots] failed to start:", err);
  });

  server.listen(config.port, () => {
    const runtime = getRuntimeConfig();
    console.log(`Tactoe server running on http://localhost:${config.port}`);
    console.log(`Database: ${getDatabaseProvider()}`);
    console.log(`Mock escrow: ${runtime.mockEscrow}`);
    console.log(`Player auth required: ${config.requirePlayerAuth}`);
    console.log(`Fee recipient: ${getFeeRecipientPublicKey()}`);
    console.log(`Admin panel API: /api/admin (platform login)`);
  });
}

bootstrap().catch((err) => {
  console.error("[server] Failed to start", err);
  process.exit(1);
});
