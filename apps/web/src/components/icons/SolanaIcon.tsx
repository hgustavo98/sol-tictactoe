import { useId } from "react";
import { cn } from "@/lib/utils";

interface SolanaIconProps {
  className?: string;
  title?: string;
}

/** Logo oficial da Solana (gradiente roxo → verde). */
export function SolanaIcon({ className, title }: SolanaIconProps) {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={!title}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="8"
          y1="120"
          x2="120"
          y2="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9945FF" />
          <stop offset="1" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M93.9 63.6H12.1c-1.4 0-2.1 1.7-1.1 2.7l40.8 40.8c.6.6 1.3.9 2.1.9h81.8c1.4 0 2.1-1.7 1.1-2.7L96 64.5c-.6-.6-1.3-.9-2.1-.9zM12.1 32.4h81.8c1.4 0 2.1-1.7 1.1-2.7L53.1 1.1c-.6-.6-1.3-.9-2.1-.9H12.1c-1.4 0-2.1 1.7-1.1 2.7l40.8 40.8c.6.6 1.3.9 2.1.9zm81.8 0H12.1c-1.4 0-2.1 1.7-1.1 2.7l40.8 40.8c.6.6 1.3.9 2.1.9h81.8c1.4 0 2.1-1.7 1.1-2.7L95 33.3c-.6-.6-1.3-.9-2.1-.9z"
      />
    </svg>
  );
}

interface SolAmountProps {
  amount: string | number;
  className?: string;
  iconClassName?: string;
  /** Exibe sufixo " SOL" após o valor. */
  suffix?: boolean;
}

export function SolAmount({
  amount,
  className,
  iconClassName = "size-3.5",
  suffix = false,
}: SolAmountProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <SolanaIcon className={iconClassName} title="SOL" />
      <span>{amount}</span>
      {suffix && <span className="text-[0.85em] font-semibold opacity-80">SOL</span>}
    </span>
  );
}
