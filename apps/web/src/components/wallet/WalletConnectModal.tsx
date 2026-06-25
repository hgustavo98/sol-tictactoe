import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import type { Wallet } from "@solana/wallet-adapter-react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getRecentWalletName,
  setRecentWalletName,
} from "./walletStorage";
import {
  pickCompactWallets,
  sortWallets,
  walletBadge,
  type WalletBadge,
} from "./walletUtils";
import { markExplicitWalletConnect, resetExplicitWalletConnect } from "../../hooks/walletConnectIntent";

interface WalletConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Acima do Html do R3F/drei (z-index alto por padrão). */
const WALLET_MODAL_Z = 50_000_000;

function WalletStatusBadge({ badge }: { badge: WalletBadge }) {
  const { t } = useTranslation();
  if (!badge) return null;

  return (
    <span
      className={
        badge === "recent"
          ? "wallet-connect-badge wallet-connect-badge--recent"
          : "wallet-connect-badge wallet-connect-badge--detected"
      }
    >
      <span
        style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: badge === "recent" ? "var(--primary)" : "#4ade80",
        }}
      />
      {t(badge === "recent" ? "wallet.badgeRecent" : "wallet.badgeDetected")}
    </span>
  );
}

function WalletRow({
  wallet,
  badge,
  connecting,
  onConnect,
}: {
  wallet: Wallet;
  badge: WalletBadge;
  connecting: boolean;
  onConnect: (name: WalletName) => void;
}) {
  const { adapter } = wallet;

  return (
    <button
      type="button"
      disabled={connecting}
      onClick={() => onConnect(adapter.name)}
      className="wallet-connect-option"
    >
      <img src={adapter.icon} alt="" width={28} height={28} />
      <span>{adapter.name}</span>
      {connecting ? (
        <Loader2
          className="ml-auto size-4 animate-spin text-white/50"
          style={{ marginLeft: "auto" }}
        />
      ) : (
        <WalletStatusBadge badge={badge} />
      )}
    </button>
  );
}

export function WalletConnectModal({
  open,
  onOpenChange,
}: WalletConnectModalProps) {
  const { t } = useTranslation();
  const { wallets, select, connect, connected, publicKey, wallet } = useWallet();
  const [view, setView] = useState<"compact" | "full">("compact");
  const [connecting, setConnecting] = useState<WalletName | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recentName = getRecentWalletName();
  const sorted = useMemo(() => sortWallets(wallets), [wallets]);
  const compactWallets = useMemo(() => pickCompactWallets(wallets), [wallets]);
  const hasInstalled = wallets.some(
    (w) => w.readyState === WalletReadyState.Installed,
  );

  useEffect(() => {
    if (open) {
      setView(hasInstalled ? "compact" : "full");
      setError(null);
      setConnecting(null);
    }
  }, [open, hasInstalled]);

  useEffect(() => {
    if (!open || !connected || !publicKey) return;
    if (wallet?.adapter.name) {
      setRecentWalletName(wallet.adapter.name);
    }
    onOpenChange(false);
  }, [open, connected, publicKey, wallet, onOpenChange]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setView("compact");
      setError(null);
      setConnecting(null);
    }
    onOpenChange(next);
  };

  const handleConnect = async (name: WalletName) => {
    const target = wallets.find((w) => w.adapter.name === name);
    if (!target) return;

    setError(null);
    setConnecting(name);
    onOpenChange(false);
    markExplicitWalletConnect();

    try {
      select(name);
      await connect();
      setRecentWalletName(name);
    } catch (err) {
      console.error("[wallet] connect failed", err);
      resetExplicitWalletConnect();
      onOpenChange(true);
      setError(
        err instanceof Error ? err.message : t("wallet.connectError"),
      );
    } finally {
      setConnecting(null);
    }
  };

  const showFull = view === "full";

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="wallet-connect-overlay"
          style={{ zIndex: WALLET_MODAL_Z }}
        />
        <Dialog.Content
          className="wallet-connect-dialog"
          style={{ zIndex: WALLET_MODAL_Z + 1 }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">{t("wallet.title")}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {t("wallet.description")}
          </Dialog.Description>

          {showFull ? (
            <div className="wallet-connect-body">
              <div className="wallet-connect-head">
                <button
                  type="button"
                  aria-label={t("wallet.back")}
                  className="wallet-connect-close"
                  onClick={() => {
                    if (hasInstalled) {
                      setView("compact");
                    } else {
                      handleOpenChange(false);
                    }
                  }}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div style={{ fontWeight: 600, fontSize: "1.125rem" }}>
                  {t("wallet.selectWallet")}
                </div>
                <Dialog.Close
                  type="button"
                  aria-label={t("wallet.close")}
                  className="wallet-connect-close"
                >
                  <X className="size-4" />
                </Dialog.Close>
              </div>

              <div
                className="custom-scrollbar wallet-connect-list"
                style={{ maxHeight: "min(360px, 55vh)", overflow: "auto" }}
              >
                {sorted.map((w) => (
                  <WalletRow
                    key={w.adapter.name}
                    wallet={w}
                    badge={walletBadge(w, recentName)}
                    connecting={connecting === w.adapter.name}
                    onConnect={handleConnect}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="wallet-connect-body">
              <div className="wallet-connect-head">
                <div style={{ width: 32 }} />
                <p className="wallet-connect-subtitle">
                  {t("wallet.connectSubtitle")}
                </p>
                <Dialog.Close
                  type="button"
                  aria-label={t("wallet.close")}
                  className="wallet-connect-close"
                >
                  <X className="size-4" />
                </Dialog.Close>
              </div>

              <div className="wallet-connect-or">{t("wallet.orConnect")}</div>

              <div className="wallet-connect-list">
                {compactWallets.map((w) => (
                  <WalletRow
                    key={w.adapter.name}
                    wallet={w}
                    badge={walletBadge(w, recentName)}
                    connecting={connecting === w.adapter.name}
                    onConnect={handleConnect}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setView("full")}
                  className="wallet-connect-option"
                >
                  <span className="wallet-connect-option-icon">
                    <WalletIcon className="size-4 text-white/70" />
                  </span>
                  <span>{t("wallet.moreWallets")}</span>
                  <ChevronRight
                    className="size-4 text-white/45"
                    style={{ marginLeft: "auto" }}
                  />
                </button>
              </div>
            </div>
          )}

          {error && <p className="wallet-connect-error">{error}</p>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
