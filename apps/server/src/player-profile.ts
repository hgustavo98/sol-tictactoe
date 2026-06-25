import {
  isBotWallet,
  isGuestWallet,
  normalizeNicknameKey,
  validateAvatarDataUrl,
  validateNickname,
  type PlayerProfile,
  type UpdatePlayerProfileInput,
} from "@sol-tictactoe/shared";
import { getStore } from "./database";

export class ProfileUpdateError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ProfileUpdateError";
  }
}

export async function updatePlayerProfile(
  wallet: string,
  input: UpdatePlayerProfileInput,
): Promise<PlayerProfile> {
  if (isGuestWallet(wallet)) {
    throw new ProfileUpdateError(
      "guest_not_allowed",
      "Guests cannot set a profile",
    );
  }
  if (isBotWallet(wallet)) {
    throw new ProfileUpdateError(
      "bot_not_allowed",
      "This profile cannot be edited",
    );
  }

  await getStore().getOrCreatePlayer(wallet);

  let nickname: string | null | undefined = input.nickname;
  let avatarUrl: string | null | undefined = input.avatarUrl;

  if (nickname !== undefined) {
    if (nickname === null || nickname.trim() === "") {
      nickname = null;
    } else {
      const err = validateNickname(nickname);
      if (err) throw new ProfileUpdateError(err, `Invalid nickname: ${err}`);
      nickname = nickname.trim();
      const taken = await getStore().isNicknameTaken(
        normalizeNicknameKey(nickname),
        wallet,
      );
      if (taken) throw new ProfileUpdateError("taken", "Nickname already taken");
    }
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl === null || avatarUrl === "") {
      avatarUrl = null;
    } else {
      const err = validateAvatarDataUrl(avatarUrl);
      if (err === "invalid") {
        throw new ProfileUpdateError("invalid_avatar", "Invalid avatar image");
      }
      if (err === "too_large") {
        throw new ProfileUpdateError("avatar_too_large", "Avatar too large");
      }
    }
  }

  return getStore().updatePlayerProfile(wallet, { nickname, avatarUrl });
}

export async function searchPlayers(
  query: string,
  limit = 20,
): Promise<PlayerProfile[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  return getStore().searchPlayers(q, Math.min(limit, 50));
}

export async function getPlayerProfilesBatch(
  wallets: string[],
): Promise<PlayerProfile[]> {
  const unique = [...new Set(wallets.filter(Boolean))];
  if (unique.length === 0) return [];
  return getStore().getPlayerProfilesBatch(unique.slice(0, 80));
}
