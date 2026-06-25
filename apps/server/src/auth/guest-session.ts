import { randomBytes, randomUUID } from "crypto";
import { config } from "../config";
import {
  bindGuestSessionSocket,
  createGuestSession,
  getGuestSession,
  releaseGuestSessionSocket,
} from "../db";

interface GuestSessionRecord {
  guestId: string;
  expiresAt: number;
  socketId?: string;
}

/** In-memory fallback when Mongo is temporarily unavailable. */
const memorySessions = new Map<string, GuestSessionRecord>();

const GUEST_TTL_MS = 24 * 60 * 60 * 1000;

function pruneMemory(): void {
  const now = Date.now();
  for (const [token, session] of memorySessions) {
    if (session.expiresAt <= now) memorySessions.delete(token);
  }
}

export async function issueGuestSession(): Promise<{
  guestId: string;
  token: string;
  expiresAt: number;
}> {
  pruneMemory();
  const guestId = `guest_${randomUUID()}`;
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + GUEST_TTL_MS;

  try {
    await createGuestSession({
      token,
      guestId,
      createdAt: Date.now(),
      expiresAt,
      socketId: null,
    });
  } catch {
    memorySessions.set(token, { guestId, expiresAt });
  }

  return { guestId, token, expiresAt };
}

export async function resolveGuestToken(token: string): Promise<string | null> {
  try {
    const session = await getGuestSession(token);
    if (session) return session.guestId;
  } catch {
    /* fall through to memory */
  }

  pruneMemory();
  const session = memorySessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    memorySessions.delete(token);
    return null;
  }
  return session.guestId;
}

/** Bind guest token to a single active socket. Returns false if already bound elsewhere. */
export async function bindGuestSocket(
  token: string,
  socketId: string,
): Promise<boolean> {
  try {
    return await bindGuestSessionSocket(token, socketId);
  } catch {
    pruneMemory();
    const session = memorySessions.get(token);
    if (!session || session.expiresAt <= Date.now()) return false;
    session.socketId = socketId;
    return true;
  }
}

export async function releaseGuestSocket(socketId: string): Promise<void> {
  try {
    await releaseGuestSessionSocket(socketId);
  } catch {
    for (const session of memorySessions.values()) {
      if (session.socketId === socketId) {
        session.socketId = undefined;
      }
    }
  }
}

/** In production, raw client-supplied guest IDs are not trusted on the socket. */
export function allowClientGuestIdHandshake(): boolean {
  return !config.requirePlayerAuth || !config.isProduction;
}
