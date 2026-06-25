const RECENT_WALLET_KEY = "sol-ttt-recent-wallet";

export function getRecentWalletName(): string | null {
  try {
    return localStorage.getItem(RECENT_WALLET_KEY);
  } catch {
    return null;
  }
}

export function setRecentWalletName(name: string): void {
  try {
    localStorage.setItem(RECENT_WALLET_KEY, name);
  } catch {
    /* ignore */
  }
}
