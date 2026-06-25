import { Router } from "express";
import {
  createWalletSignInChallenge,
  logoutPlayerSession,
  resolvePlayerSession,
  verifyWalletSignIn,
} from "./auth/player-auth";
import { issueGuestSession } from "./auth/guest-session";
import { rateLimit } from "./auth/rate-limit";
import { requirePlayerSession, type PlayerAuthRequest } from "./auth/player-middleware";

export const playerAuthRouter = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyPrefix: "player-auth:",
});

const guestRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: "player-guest:",
});

playerAuthRouter.use(authRateLimit);

playerAuthRouter.post("/guest", guestRateLimit, async (_req, res) => {
  try {
    res.json(await issueGuestSession());
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to create guest session",
    });
  }
});

playerAuthRouter.post("/challenge", (req, res) => {
  const wallet = String(req.body?.wallet ?? "").trim();
  if (!wallet) {
    res.status(400).json({ error: "wallet required" });
    return;
  }
  try {
    res.json(createWalletSignInChallenge(wallet));
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Invalid challenge request",
    });
  }
});

playerAuthRouter.post("/verify", async (req, res) => {
  const wallet = String(req.body?.wallet ?? "").trim();
  const signature = String(req.body?.signature ?? "").trim();
  const nonce = String(req.body?.nonce ?? "").trim();
  if (!wallet || !signature || !nonce) {
    res.status(400).json({ error: "wallet, signature and nonce are required" });
    return;
  }
  try {
    const session = await verifyWalletSignIn({ wallet, signature, nonce });
    res.json(session);
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : "Verification failed",
    });
  }
});

playerAuthRouter.get("/session", async (req, res) => {
  const auth = req.header("Authorization");
  const token = auth?.startsWith("Bearer ")
    ? auth.slice("Bearer ".length).trim()
    : req.header("X-Player-Session");
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const session = await resolvePlayerSession(token);
  if (!session) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  res.json({
    wallet: session.wallet,
    expiresAt: session.expiresAt,
  });
});

playerAuthRouter.post("/logout", requirePlayerSession, async (req: PlayerAuthRequest, res) => {
  if (req.player?.token) {
    await logoutPlayerSession(req.player.token);
  }
  res.json({ ok: true });
});
