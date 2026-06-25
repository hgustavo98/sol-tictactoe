import { Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useCompactLayout } from "../../hooks/useCompactLayout";
import { usePlayerProfile } from "../../hooks/usePlayerProfile";
import { useWalletModal } from "./WalletModalContext";
import { WalletAccountMenu } from "./WalletAccountMenu";

interface WalletConnectButtonProps {
  className?: string;
}

export function WalletConnectButton({ className }: WalletConnectButtonProps) {
  const { t } = useTranslation();
  const isCompact = useCompactLayout();
  const { connected, publicKey } = useWallet();
  const { openWalletModal, openProfileEdit, logout } = useWalletModal();
  const wallet = publicKey?.toBase58() ?? null;
  const profile = usePlayerProfile(wallet);

  if (connected && wallet) {
    return (
      <WalletAccountMenu
        wallet={wallet}
        profile={profile}
        className={className}
        onEditProfile={openProfileEdit}
        onLogout={logout}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => openWalletModal()}
      className={cn(
        "wallet-connect-header-btn rounded-xl border-2 border-[#e63946] px-3 py-1.5",
        "bg-linear-to-b from-[#ff6b6b] to-[#b91c1c]",
        "font-game text-xs font-bold text-white",
        "shadow-[0_0_14px_rgba(230,57,70,0.45)] transition-all duration-150",
        "hover:brightness-105 active:scale-[0.98]",
        className,
      )}
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        <Wallet className="size-4 shrink-0" aria-hidden />
        <span className="wallet-connect-header-label">
          {isCompact ? t("wallet.connectShort") : t("wallet.connect")}
        </span>
      </span>
    </button>
  );
}
