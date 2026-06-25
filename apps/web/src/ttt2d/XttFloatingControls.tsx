import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { formatSolAmount } from "../config/bets";
import { useCluster } from "../hooks/useCluster";
import { useSolBalance } from "../hooks/useWalletData";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { SolanaIcon } from "../components/icons/SolanaIcon";
import { WalletConnectButton } from "../components/wallet/WalletConnectButton";

interface XttFloatingControlsProps {
  onDevnetBadgeClick?: () => void;
}

export function XttFloatingControls({ onDevnetBadgeClick }: XttFloatingControlsProps) {
  const { t } = useTranslation();
  const { connected } = useWallet();
  const { balance, refresh } = useSolBalance();
  const { isDevnet } = useCluster();

  useEffect(() => {
    if (connected) void refresh();
  }, [connected, refresh]);

  return (
    <div className="xtt-float" aria-label={t("app.title")}>
      <div className="xtt-float-left">
        {isDevnet && (
          <button
            type="button"
            className="xtt-float-pill xtt-float-pill-devnet"
            title={t("devnetWarning.badgeHint")}
            onClick={() => onDevnetBadgeClick?.()}
          >
            {t("header.networkDevnet")}
          </button>
        )}
      </div>
      <div className="xtt-float-right">
        {connected && balance !== null && (
          <div className="xtt-float-balance" title={t("header.solBalance")}>
            <SolanaIcon className="size-3.5" title="SOL" />
            <span>{formatSolAmount(balance)}</span>
          </div>
        )}
        <LanguageSwitcher variant="xtt" />
        <WalletConnectButton variant="xtt" />
      </div>
    </div>
  );
}
