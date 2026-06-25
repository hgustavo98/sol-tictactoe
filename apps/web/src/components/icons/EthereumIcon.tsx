import { cn } from "@/lib/utils";

interface EthereumIconProps {
  className?: string;
  title?: string;
}

export function EthereumIcon({ className, title }: EthereumIconProps) {
  return (
    <svg
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={!title}
    >
      <circle cx="64" cy="64" r="64" fill="#627EEA" />
      <path
        fill="#fff"
        fillOpacity="0.95"
        d="M64 24 64.5 25.2V61.5L88.5 74.5 64 24Z"
      />
      <path fill="#fff" fillOpacity="0.7" d="M64 24 39.5 74.5 64 61.5V24Z" />
      <path fill="#fff" fillOpacity="0.95" d="M64 82.8 64 103.5 88.8 78.8 64 82.8Z" />
      <path fill="#fff" fillOpacity="0.7" d="M64 103.5V82.8 39.5 78.8 64 103.5Z" />
      <path fill="#fff" fillOpacity="0.5" d="M64 76.2 88.5 74.5 64 61.5 64 76.2Z" />
      <path fill="#fff" fillOpacity="0.35" d="M39.5 74.5 64 76.2 64 61.5 39.5 74.5Z" />
    </svg>
  );
}
