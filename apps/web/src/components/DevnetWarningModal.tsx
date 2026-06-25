import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Coins,
  Droplets,
  ExternalLink,
  Wallet,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface DevnetWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEVNET_FAUCET_URL = "https://faucet.solana.com/";

const STEPS = [
  { key: "stepConnect", icon: Wallet },
  { key: "stepFaucet", icon: Droplets },
  { key: "stepDeposit", icon: Coins },
] as const;

export function DevnetWarningModal({
  open,
  onOpenChange,
}: DevnetWarningModalProps) {
  const { t } = useTranslation();

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      sessionStorage.setItem("sol-ttt-devnet-warning-dismissed", "1");
    }
    onOpenChange(next);
  };

  if (!open) return null;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="donate-modal-overlay" />
        <Dialog.Content className="devnet-modal-content">
          <div className="devnet-modal-head">
            <div className="devnet-modal-title-wrap">
              <span className="devnet-modal-icon-badge" aria-hidden>
                <AlertTriangle className="size-5" />
              </span>
              <div className="devnet-modal-title-block">
                <Dialog.Title className="devnet-modal-title">
                  {t("devnetWarning.title")}
                </Dialog.Title>
                <Dialog.Description className="devnet-modal-subtitle">
                  {t("devnetWarning.subtitle")}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="donate-modal-close"
                aria-label={t("devnetWarning.close")}
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="devnet-modal-body custom-scrollbar">
            <p className="devnet-modal-lead">{t("devnetWarning.body")}</p>

            <ol className="devnet-modal-steps">
              {STEPS.map(({ key, icon: Icon }, index) => (
                <li key={key} className="devnet-modal-step">
                  <span className="devnet-modal-step-num" aria-hidden>
                    {index + 1}
                  </span>
                  <span className="devnet-modal-step-icon" aria-hidden>
                    <Icon className="size-4" />
                  </span>
                  <p className="devnet-modal-step-text">{t(`devnetWarning.${key}`)}</p>
                </li>
              ))}
            </ol>

            <a
              href={DEVNET_FAUCET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="devnet-modal-faucet"
            >
              <Droplets className="size-5 shrink-0" aria-hidden />
              <span className="devnet-modal-faucet-label">
                {t("devnetWarning.faucetLink")}
              </span>
              <ExternalLink className="size-4 shrink-0 opacity-80" aria-hidden />
            </a>
          </div>

          <div className="devnet-modal-footer">
            <Dialog.Close asChild>
              <button type="button" className="devnet-modal-confirm">
                {t("devnetWarning.gotIt")}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
