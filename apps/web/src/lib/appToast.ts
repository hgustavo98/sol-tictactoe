import { toast } from "sonner";
import type { TFunction } from "i18next";
import {
  CUSTOM_MAX_BET_SOL,
  CUSTOM_MIN_BET_SOL,
  RANKED_MAX_BET_SOL,
  RANKED_MIN_BET_SOL,
} from "@/config/bets";

function isWalletRejection(message: string): boolean {
  return /user rejected|rejected the request|transaction cancelled|declined/i.test(
    message,
  );
}

export function resolveAppErrorMessage(error: string, t: TFunction): string {
  if (error === "guest_session_loading") {
    return t("errors.guestSessionLoading");
  }
  if (error === "guest_session_failed") {
    return t("errors.guestSessionFailed");
  }
  if (error === "wallet_required") {
    return t("errors.walletRequired");
  }
  if (error === "sign_in_required") {
    return t("errors.signInRequired");
  }
  if (error === "wallet_connect_for_tx") {
    return t("errors.walletConnectForTx");
  }
  if (error === "escrow_not_ready") {
    return t("errors.escrowNotReady");
  }
  if (error === "escrow_devnet_only") {
    return t("errors.escrowDevnetOnly");
  }
  if (error === "config_loading") {
    return t("errors.configLoading");
  }
  if (error === "config_failed") {
    return t("errors.configFailed");
  }
  if (error === "wallet_no_sign") {
    return t("errors.walletNoSign");
  }
  if (error === "invalid") {
    return t("errors.bet.invalid");
  }
  if (error === "min") {
    return t("errors.bet.min", { min: CUSTOM_MIN_BET_SOL });
  }
  if (error === "max") {
    return t("errors.bet.max", { max: CUSTOM_MAX_BET_SOL });
  }
  if (error === "ranked_min") {
    return t("errors.bet.min", { min: RANKED_MIN_BET_SOL });
  }
  if (error === "ranked_max") {
    return t("errors.bet.max", { max: RANKED_MAX_BET_SOL });
  }
  if (error === "mode_mismatch") {
    return t("errors.modeMismatch");
  }
  if (error === "draw_not_allowed") {
    return t("errors.drawNotAllowed");
  }
  if (error === "already_hosting") {
    return t("errors.alreadyHosting");
  }
  if (error === "Failed to create match" || error === "Failed to join") {
    return t(error === "Failed to join" ? "errors.join" : "errors.createMatch");
  }
  if (isWalletRejection(error)) {
    return t("errors.walletRejected");
  }
  return error;
}

export function toastAppError(error: string, t: TFunction): void {
  toast.error(resolveAppErrorMessage(error, t));
}

export function toastAppSuccess(message: string): void {
  toast.success(message);
}

export function toastAppInfo(message: string): void {
  toast.info(message);
}
