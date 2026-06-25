import type { Request, Response, NextFunction } from "express";
import { resolveSession } from "./admin-auth";
import { config } from "../config";

export interface AdminRequest extends Request {
  admin?: { actor: string; platformId: string; token: string };
}

function extractToken(req: Request): string | undefined {
  const auth = req.header("Authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }
  return req.header("X-Admin-Session") ?? req.header("X-Admin-Token") ?? undefined;
}

export async function requireAdminSession(
  req: AdminRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const session = await resolveSession(token);
  if (session) {
    req.admin = { ...session, token };
    next();
    return;
  }

  if (token === config.adminApiKey || token === config.adminSecret) {
    if (!config.isProduction) {
      req.admin = { actor: "api_key", platformId: "local", token };
      next();
      return;
    }
  }

  res.status(401).json({ error: "Unauthorized" });
}
