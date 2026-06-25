import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: number;
  decorative?: boolean;
}

export function BrandLogo({
  className,
  size = 40,
  decorative = true,
}: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "SOL TTT"}
      className={cn("select-none shrink-0", className)}
      role={decorative ? "presentation" : "img"}
    >
      <defs>
        <linearGradient id="ttt-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#150734" />
          <stop offset="100%" stopColor="#0d0221" />
        </linearGradient>
        <linearGradient id="ttt-logo-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f5d4" />
          <stop offset="100%" stopColor="#9b5de5" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#ttt-logo-bg)" stroke="url(#ttt-logo-glow)" strokeWidth="2" />
      <line x1="18" y1="18" x2="30" y2="30" stroke="#00f5d4" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="30" y1="18" x2="18" y2="30" stroke="#00f5d4" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="42" cy="22" r="7" fill="none" stroke="#f15bb5" strokeWidth="3" />
      <rect x="20" y="36" width="24" height="3" rx="1.5" fill="#9b5de5" opacity="0.6" />
      <rect x="26" y="42" width="12" height="3" rx="1.5" fill="#fee440" opacity="0.8" />
    </svg>
  );
}

export const BRAND_LOGO_SRC = "";
