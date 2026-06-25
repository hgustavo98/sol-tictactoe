import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import type { Adapter } from "@solana/wallet-adapter-base";
import {
  BitgetWalletAdapter,
  BitpieWalletAdapter,
  CloverWalletAdapter,
  Coin98WalletAdapter,
  CoinbaseWalletAdapter,
  CoinhubWalletAdapter,
  LedgerWalletAdapter,
  MathWalletAdapter,
  PhantomWalletAdapter,
  SafePalWalletAdapter,
  SolflareWalletAdapter,
  SolongWalletAdapter,
  TokenPocketWalletAdapter,
  TorusWalletAdapter,
  WalletConnectWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { getSolanaCluster } from "./tokens";

/** Ordem de exibição no modal (como apps de referência). */
export const WALLET_DISPLAY_ORDER = [
  "Phantom",
  "Jupiter",
  "Solflare",
  "Torus",
  "Ledger",
  "MathWallet",
  "TokenPocket",
  "Coinbase Wallet",
  "Solong",
  "Coin98",
  "SafePal",
  "Bitpie",
  "Bitget",
  "Clover",
  "Coinhub",
  "WalletConnect",
] as const;

function walletConnectNetwork(): WalletAdapterNetwork.Mainnet | WalletAdapterNetwork.Devnet {
  return getSolanaCluster() === "mainnet-beta"
    ? WalletAdapterNetwork.Mainnet
    : WalletAdapterNetwork.Devnet;
}

export function createSolanaWalletAdapters(): Adapter[] {
  const adapters: Adapter[] = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter(),
    new MathWalletAdapter(),
    new TokenPocketWalletAdapter(),
    new CoinbaseWalletAdapter(),
    new SolongWalletAdapter(),
    new Coin98WalletAdapter(),
    new SafePalWalletAdapter(),
    new BitpieWalletAdapter(),
    new BitgetWalletAdapter(),
    new CloverWalletAdapter(),
    new CoinhubWalletAdapter(),
  ];

  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
    | string
    | undefined;
  if (projectId) {
    adapters.push(
      new WalletConnectWalletAdapter({
        network: walletConnectNetwork(),
        options: { projectId },
      }),
    );
  }

  return adapters;
}
