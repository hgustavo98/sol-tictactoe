import { cn } from "@/lib/utils";

interface BitcoinIconProps {
  className?: string;
  title?: string;
}

export function BitcoinIcon({ className, title }: BitcoinIconProps) {
  return (
    <svg
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={!title}
    >
      <circle cx="64" cy="64" r="64" fill="#F7931A" />
      <path
        fill="#fff"
        d="M74.2 54.8c1.1-7.3-4.5-11.2-12.1-13.8l2.5-9.9-6-1.5-2.4 9.6c-1.6-.4-3.2-.8-4.8-1.2l2.4-9.7-6-1.5-2.5 9.9c-1.3-.3-2.6-.6-3.8-.9l.1-.4-8.3-2.1-1.6 6.5s4.5 1 4.4 1.1c2.5.6 2.9 2.2 2.8 3.5l-2.8 11.3c.2 0 .4.1.7.2l-.7-.2-3.9 15.8c-.3.7-1 1.8-2.7 1.4 0 0-4.4-1.1-4.4-1.1l-3 7.1 7.8 2c1.4.4 2.9.7 4.3 1.1l-2.5 10.1 6 1.5 2.5-9.9c1.6.4 3.2.8 4.7 1.2l-2.5 9.8 6 1.5 2.5-10.1c9.9 1.9 17.3 1.1 20.4-7.8 2.5-7.2-.1-11.3-5.3-14 3.8-.9 6.6-3.4 7.4-8.6zm-13.2 18.8c-1.8 7.2-14 3.3-17.9 2.3l3.2-12.8c3.9 1 16.5 2.9 14.7 10.5zm1.8-18.9c-1.6 6.5-11.8 3.2-14.9 2.4l2.9-11.6c3.1.8 13.7 2.3 12 9.2z"
      />
    </svg>
  );
}
