import { useTranslation } from "react-i18next";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import {
  actionsBar,
  actionsPanel,
  connectWalletBtn,
  guestWalletHint,
  guestWalletPrompt,
} from "./lobbyClasses";

/** Aviso + conectar carteira quando convidado visualiza modos bloqueados. */
export function LobbyGuestWalletPrompt() {
  const { t } = useTranslation();

  return (
    <div className={actionsBar}>
      <div className={actionsPanel}>
        <div className={guestWalletPrompt}>
          <p className={guestWalletHint}>{t("lobby.guestModesLocked")}</p>
          <WalletConnectButton className={connectWalletBtn} />
        </div>
      </div>
    </div>
  );
}
