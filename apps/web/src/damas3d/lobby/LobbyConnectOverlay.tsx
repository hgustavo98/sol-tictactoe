import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/icons/BrandLogo";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import {
  connectCard,
  connectCardShell,
  connectIcon,
  connectOverlay,
  connectText,
  connectWalletBtn,
  guestPlayBtn,
} from "./lobbyClasses";

interface LobbyConnectOverlayProps {
  message?: string;
  guestStarting?: boolean;
  onPlayAsGuest?: () => void;
  onRetrySignIn?: () => void;
  retryLabel?: string;
}

/** Tela inicial — conectar carteira ou jogar como convidado. */
export function LobbyConnectOverlay({
  message,
  guestStarting = false,
  onPlayAsGuest,
  onRetrySignIn,
  retryLabel,
}: LobbyConnectOverlayProps) {
  const { t } = useTranslation();
  const text = message ?? t("lobby.connectWallet");

  return (
    <div className={connectOverlay} role="region" aria-label={text}>
      <div className={connectCardShell}>
        <BrandLogo className={connectIcon} size={88} />
        <div className={connectCard}>
          <p className={connectText}>{text}</p>
        </div>
        {onRetrySignIn ? (
          <button
            type="button"
            className={connectWalletBtn}
            onClick={() => void onRetrySignIn()}
          >
            {retryLabel ?? t("auth.retry")}
          </button>
        ) : (
          <WalletConnectButton className={connectWalletBtn} />
        )}
        {onPlayAsGuest && (
          <button
            type="button"
            className={guestPlayBtn}
            disabled={guestStarting}
            onClick={onPlayAsGuest}
          >
            {guestStarting ? t("errors.guestSessionLoading") : t("lobby.playAsGuest")}
          </button>
        )}
      </div>
    </div>
  );
}
