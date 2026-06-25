function shortenAddress(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 1) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;
export const NICKNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
export const MAX_AVATAR_BYTES = 200_000;

export type NicknameErrorKey =
  | "too_short"
  | "too_long"
  | "invalid_chars"
  | "taken"
  | "guest_not_allowed";

export function normalizeNicknameKey(nickname: string): string {
  return nickname.trim().toLowerCase();
}

export function validateNickname(nickname: string): NicknameErrorKey | null {
  const trimmed = nickname.trim();
  if (trimmed.length < NICKNAME_MIN_LENGTH) return "too_short";
  if (trimmed.length > NICKNAME_MAX_LENGTH) return "too_long";
  if (!NICKNAME_PATTERN.test(trimmed)) return "invalid_chars";
  return null;
}

export function guestShortId(wallet: string): string {
  const raw = wallet
    .replace(/^guest_gr_/, "")
    .replace(/^guest_/, "")
    .replace(/-/g, "");
  return raw.slice(0, 4).toUpperCase();
}

export function displayPlayerName(
  profile?: { wallet: string; nickname?: string | null } | null,
  guestLabel = "Guest",
): string {
  if (!profile) return guestLabel;
  if (profile.nickname?.trim()) return profile.nickname.trim();
  if (profile.wallet.startsWith("guest_")) {
    return `${guestLabel} · ${guestShortId(profile.wallet)}`;
  }
  return shortenAddress(profile.wallet, 4);
}

export function playerMatchesSearch(
  wallet: string,
  nickname: string | null | undefined,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (wallet.toLowerCase().includes(q)) return true;
  if (nickname?.toLowerCase().includes(q)) return true;
  return false;
}

function normalizeMatchSearchToken(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, "");
}

/** Match lobby UUID by full id, prefix, or hyphen-free fragment (e.g. 8a7c2a77). */
export function matchIdMatchesSearch(matchId: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (matchId.toLowerCase().includes(q)) return true;
  const normalizedQuery = normalizeMatchSearchToken(q);
  if (!normalizedQuery) return true;
  return normalizeMatchSearchToken(matchId).includes(normalizedQuery);
}

export function openTableMatchesSearch(
  lobby: { id: string; player1: string },
  nickname: string | null | undefined,
  query: string,
): boolean {
  return (
    playerMatchesSearch(lobby.player1, nickname, query) ||
    matchIdMatchesSearch(lobby.id, query)
  );
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return dataUrl.length;
  const base64 = dataUrl.slice(comma + 1);
  return Math.ceil((base64.length * 3) / 4);
}

export function validateAvatarDataUrl(dataUrl: string): "invalid" | "too_large" | null {
  if (!dataUrl.startsWith("data:image/")) return "invalid";
  const mime = dataUrl.slice(5, dataUrl.indexOf(";"));
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) return "invalid";
  if (estimateDataUrlBytes(dataUrl) > MAX_AVATAR_BYTES) return "too_large";
  return null;
}
