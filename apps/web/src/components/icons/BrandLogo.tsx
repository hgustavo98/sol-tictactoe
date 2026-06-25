import { cn } from "@/lib/utils";
import { GAME_THEME } from "@/ttt2d/theme";

interface BrandLogoProps {
  className?: string;
  size?: number;
  decorative?: boolean;
}

export function BrandLogo({
  className,
  size = 32,
  decorative = true,
}: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "SOL Tic Tac Toe"}
      className={cn("select-none shrink-0", className)}
      role={decorative ? "presentation" : "img"}
    >
      <rect x="4" y="4" width="40" height="40" rx="10" fill={GAME_THEME.bgPanel} stroke={GAME_THEME.blue} strokeWidth="1.5" opacity="0.9" />
      <line x1="14" y1="14" x2="22" y2="22" stroke={GAME_THEME.xColor} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="22" y1="14" x2="14" y2="22" stroke={GAME_THEME.xColor} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="16" r="5" fill="none" stroke={GAME_THEME.oColor} strokeWidth="2.2" />
      <rect x="16" y="34" width="16" height="2" rx="1" fill={GAME_THEME.purple} opacity="0.55" />
    </svg>
  );
}

export const BRAND_LOGO_SRC = "";
