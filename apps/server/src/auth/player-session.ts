import { randomBytes } from "crypto";
import { createPlayerSession, revokePlayerSessions } from "../db";
import { config } from "../config";

export async function issuePlayerSession(
  wallet: string,
): Promise<{ token: string; expiresAt: number; wallet: string }> {
  await revokePlayerSessions(wallet);
  const token = randomBytes(32).toString("hex");
  const createdAt = Date.now();
  const expiresAt = createdAt + config.playerSessionTtlMs;
  await createPlayerSession({
    token,
    wallet,
    createdAt,
    expiresAt,
  });
  return { token, expiresAt, wallet };
}
