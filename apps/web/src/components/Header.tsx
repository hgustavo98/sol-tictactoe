import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { formatSolAmount } from "../config/bets";
import { useCluster } from "../hooks/useCluster";
import { useSolBalance } from "../hooks/useWalletData";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { BrandLogo } from "./icons/BrandLogo";
import { SolanaIcon } from "./icons/SolanaIcon";
import { WalletConnectButton } from "./wallet/WalletConnectButton";
import { cn } from "@/lib/utils";

const CLUSTER_I18N_KEY = {
  devnet: "header.networkDevnet",
  testnet: "header.networkTestnet",
  "mainnet-beta": "header.networkMainnet",
} as const;

interface HeaderProps {
  onDevnetBadgeClick?: () => void;
}

export function Header({ onDevnetBadgeClick }: HeaderProps) {
  const { t } = useTranslation();
  const { connected } = useWallet();
  const { balance, refresh } = useSolBalance();
  const { cluster, isDevnet } = useCluster();

  useEffect(() => {
    if (connected) {
      void refresh();
    }
  }, [connected, refresh]);

  const showBalance = connected && balance !== null;

  const devnetBadge = isDevnet ? (
    <button
      type="button"
      className={cn(
        "rounded px-2 py-1 font-display text-[0.62rem] font-bold tracking-wider uppercase",
        "bg-amber-500/15 text-amber-300 border border-amber-500/25",
        "hover:bg-amber-500/25 transition-colors cursor-pointer",
      )}
      title={t("devnetWarning.badgeHint")}
      aria-label={t("devnetWarning.badgeHint")}
      onClick={() => onDevnetBadgeClick?.()}
    >
      {t(CLUSTER_I18N_KEY.devnet)}
    </button>
  ) : null;

  return (
    <header className="game-header">
      <div className="game-header-inner">
        <div className="game-header-brand">
          <BrandLogo className="game-header-logo" size={28} />
          <span className="game-header-title">{t("app.title")}</span>
          {devnetBadge}
        </div>

        <div className="game-header-currency">
          <LanguageSwitcher />
          {showBalance && (
            <div
              className="game-sol-balance"
              title={t("header.solBalanceNetwork", {
                network: t(CLUSTER_I18N_KEY[cluster]),
              })}
            >
              <SolanaIcon className="size-5" title="SOL" />
              <span className="game-sol-amount">
                {formatSolAmount(balance)}
              </span>
              <span className="game-sol-unit">SOL</span>
              {!isDevnet && (
                <span
                  className={cn(
                    "rounded px-1 py-0.5 font-display text-[0.5rem] font-bold tracking-wider uppercase",
                    "bg-white/8 text-white/55",
                  )}
                >
                  {t(CLUSTER_I18N_KEY[cluster])}
                </span>
              )}
            </div>
          )}
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
