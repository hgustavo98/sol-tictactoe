import { cn } from "@/lib/utils";
import type { PlayerProfile } from "@sol-tictactoe/shared";
import {
  displayPlayerName,
  getBotPersona,
  guestShortId,
  isBotWallet,
  isGuestWallet,
} from "@sol-tictactoe/shared";

interface PlayerAvatarProps {
  profile?: Pick<PlayerProfile, "wallet" | "nickname" | "avatarUrl"> | null;
  wallet?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClass = {
  sm: "player-avatar-sm",
  md: "player-avatar-md",
  lg: "player-avatar-lg",
} as const;

export function PlayerAvatar({
  profile,
  wallet,
  size = "md",
  className,
}: PlayerAvatarProps) {
  const resolved = profile ?? (wallet ? { wallet, nickname: null, avatarUrl: null } : null);
  const label = displayPlayerName(resolved);
  const isGuest = resolved?.wallet ? isGuestWallet(resolved.wallet) : false;
  const avatarUrl =
    resolved?.avatarUrl ??
    (resolved?.wallet && isBotWallet(resolved.wallet)
      ? getBotPersona(resolved.wallet)?.avatarUrl
      : undefined);
  const initial = isGuest
    ? guestShortId(resolved!.wallet).slice(0, 2)
    : (resolved?.nickname?.[0] ?? resolved?.wallet?.[0] ?? "?").toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={label}
        className={cn("player-avatar", sizeClass[size], className)}
      />
    );
  }

  return (
    <span
      className={cn("player-avatar player-avatar-fallback", sizeClass[size], className)}
      aria-hidden
    >
      {initial}
    </span>
  );
}
