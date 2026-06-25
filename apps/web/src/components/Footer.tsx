import { WalletConnectButton } from "./wallet/WalletConnectButton";

export function Footer() {
  return (
    <footer className="border-t border-[var(--sc-border)] mt-auto py-6">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--sc-muted)]">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--sc-border)] px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-gradient-to-r from-[var(--sc-accent)] to-[var(--sc-accent2)]" />
          Powered by Solana
        </span>
        <WalletConnectButton />
      </div>
    </footer>
  );
}
