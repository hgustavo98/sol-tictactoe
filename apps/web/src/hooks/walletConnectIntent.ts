/** True quando o usuário escolheu carteira no modal (não auto-connect no load). */
let explicitWalletConnect = false;

export function markExplicitWalletConnect(): void {
  explicitWalletConnect = true;
}

export function consumeExplicitWalletConnect(): boolean {
  const value = explicitWalletConnect;
  explicitWalletConnect = false;
  return value;
}

export function resetExplicitWalletConnect(): void {
  explicitWalletConnect = false;
}
