import type { Request, Response, NextFunction } from "express";
import { resolvePlayerSession } from "./player-auth";
import { config } from "../config";

export interface PlayerAuthRequest extends Request {
  player?: { wallet: string; token: string };
}

function extractPlayerToken(req: Request): string | undefined {
  const auth = req.header("Authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }
  return req.header("X-Player-Session") ?? undefined;
}

export async function requirePlayerSession(
  req: PlayerAuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractPlayerToken(req);
  if (!token) {
    res.status(401).json({ error: "unauthorized", message: "Missing player session" });
    return;
  }

  const session = await resolvePlayerSession(token);
  if (!session) {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired session" });
    return;
  }

  req.player = { wallet: session.wallet, token };
  next();
}

export async function optionalPlayerSession(
  req: PlayerAuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!config.requirePlayerAuth) {
    next();
    return;
  }
  await requirePlayerSession(req, res, next);
}
