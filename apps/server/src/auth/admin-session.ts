import { randomBytes } from "crypto";
import { createAdminSession } from "../db";
import { config } from "../config";

export async function issueAdminSession(
  platformId: string,
  actor: string,
): Promise<{ token: string; expiresAt: number }> {
  const token = randomBytes(32).toString("hex");
  const createdAt = Date.now();
  const expiresAt = createdAt + config.adminSessionTtlMs;
  await createAdminSession({
    token,
    platformId,
    actor,
    createdAt,
    expiresAt,
  });
  return { token, expiresAt };
}
