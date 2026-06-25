import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import type { Wallet } from "@solana/wallet-adapter-react";
import { WALLET_DISPLAY_ORDER } from "@/config/solanaWallets";
import { getRecentWalletName } from "./walletStorage";

export type WalletBadge = "recent" | "detected" | null;

function orderIndex(name: WalletName): number {
  const idx = WALLET_DISPLAY_ORDER.indexOf(
    name as (typeof WALLET_DISPLAY_ORDER)[number],
  );
  return idx === -1 ? WALLET_DISPLAY_ORDER.length + 1 : idx;
}

export function isWalletInstalled(wallet: Wallet): boolean {
  return wallet.readyState === WalletReadyState.Installed;
}

export function sortWallets(wallets: Wallet[]): Wallet[] {
  const recent = getRecentWalletName();
  return [...wallets].sort((a, b) => {
    const aRecent = a.adapter.name === recent ? 0 : 1;
    const bRecent = b.adapter.name === recent ? 0 : 1;
    if (aRecent !== bRecent) return aRecent - bRecent;

    const aInstalled = isWalletInstalled(a) ? 0 : 1;
    const bInstalled = isWalletInstalled(b) ? 0 : 1;
    if (aInstalled !== bInstalled) return aInstalled - bInstalled;

    return orderIndex(a.adapter.name) - orderIndex(b.adapter.name);
  });
}

export function walletBadge(
  wallet: Wallet,
  recentName: string | null,
): WalletBadge {
  if (recentName && wallet.adapter.name === recentName && isWalletInstalled(wallet)) {
    return "recent";
  }
  if (isWalletInstalled(wallet)) return "detected";
  return null;
}

export function pickCompactWallets(wallets: Wallet[]): Wallet[] {
  const sorted = sortWallets(wallets);
  const installed = sorted.filter(isWalletInstalled);
  if (installed.length === 0) return sorted.slice(0, 3);
  return installed.slice(0, 3);
}
