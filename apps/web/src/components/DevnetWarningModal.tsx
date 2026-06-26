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
        <Dialog.Overlay className="xtt-devnet-overlay" />
        <Dialog.Content className="xtt-devnet-modal">
          <div className="xtt-devnet-head">
            <div className="xtt-devnet-title-wrap">
              <span className="xtt-devnet-icon-badge" aria-hidden>
                <AlertTriangle className="size-5" />
              </span>
              <div className="xtt-devnet-title-block">
                <Dialog.Title className="xtt-devnet-title">
                  {t("devnetWarning.title")}
                </Dialog.Title>
                <Dialog.Description className="xtt-devnet-subtitle">
                  {t("devnetWarning.subtitle")}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="xtt-devnet-close"
                aria-label={t("devnetWarning.close")}
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="xtt-devnet-body custom-scrollbar">
            <p className="xtt-devnet-lead">{t("devnetWarning.body")}</p>

            <ol className="xtt-devnet-steps">
              {STEPS.map(({ key, icon: Icon }, index) => (
                <li key={key} className="xtt-devnet-step">
                  <span className="xtt-devnet-step-num" aria-hidden>
                    {index + 1}
                  </span>
                  <span className="xtt-devnet-step-icon" aria-hidden>
                    <Icon className="size-4" />
                  </span>
                  <p className="xtt-devnet-step-text">{t(`devnetWarning.${key}`)}</p>
                </li>
              ))}
            </ol>

            <a
              href={DEVNET_FAUCET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="xtt-devnet-faucet"
            >
              <Droplets className="size-4 shrink-0" aria-hidden />
              <span className="xtt-devnet-faucet-label">
                {t("devnetWarning.faucetLink")}
              </span>
              <ExternalLink className="size-3.5 shrink-0 opacity-80" aria-hidden />
            </a>
          </div>

          <div className="xtt-devnet-footer">
            <Dialog.Close asChild>
              <button type="button" className="xtt-btn xtt-btn-primary xtt-devnet-confirm">
                {t("devnetWarning.gotIt")}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
