import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Code2, Heart, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DEV_DONATION_WALLETS } from "../../config/donationWallets";
import { BitcoinIcon } from "../icons/BitcoinIcon";
import { EthereumIcon } from "../icons/EthereumIcon";
import { SolanaIcon } from "../icons/SolanaIcon";
import { CopyAddressButton } from "./CopyAddressButton";

interface DonateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DonationRowProps {
  icon: ReactNode;
  label: string;
  address: string;
}

function DonationRow({ icon, label, address }: DonationRowProps) {
  return (
    <div className="donate-wallet-row">
      <div className="donate-wallet-head">
        <span className="donate-wallet-icon">{icon}</span>
        <span className="donate-wallet-label">{label}</span>
      </div>
      <div className="donate-wallet-address-row">
        <code className="donate-wallet-address">{address}</code>
        <CopyAddressButton value={address} />
      </div>
    </div>
  );
}

export function DonateModal({ open, onOpenChange }: DonateModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="donate-modal-overlay" />
        <Dialog.Content className="donate-modal-content">
          <div className="donate-modal-head">
            <div className="donate-modal-title-wrap">
              <Heart className="size-5 text-rose-400" aria-hidden />
              <Dialog.Title className="donate-modal-title">
                {t("donate.title")}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="donate-modal-close"
                aria-label={t("wallet.close")}
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="donate-modal-body custom-scrollbar">
            <div className="donate-dev-badge">
              <Code2 className="size-4 shrink-0" aria-hidden />
              <span>{t("donate.devWallets")}</span>
            </div>

            <DonationRow
              icon={<SolanaIcon className="size-6" title="Solana" />}
              label={t("donate.solana")}
              address={DEV_DONATION_WALLETS.solana}
            />
            <DonationRow
              icon={<EthereumIcon className="size-6" title="Ethereum" />}
              label={t("donate.ethereum")}
              address={DEV_DONATION_WALLETS.ethereum}
            />
            <DonationRow
              icon={<BitcoinIcon className="size-6" title="Bitcoin" />}
              label={t("donate.bitcoin")}
              address={DEV_DONATION_WALLETS.bitcoin}
            />

            <p className="donate-modal-note">{t("donate.note")}</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
