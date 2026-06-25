import { AlertTriangle, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useHardwareAccelerationWarning } from "../hooks/useHardwareAccelerationWarning";

export function HardwareAccelBanner() {
  const { t } = useTranslation();
  const { status, visible, dismiss } = useHardwareAccelerationWarning();

  if (!visible || typeof document === "undefined") return null;

  const messageKey =
    status === "unavailable"
      ? "hardwareAccel.unavailable"
      : "hardwareAccel.software";

  return createPortal(
    <aside className="hw-accel-popup" role="alertdialog" aria-labelledby="hw-accel-title">
      <div className="hw-accel-popup-head">
        <AlertTriangle className="hw-accel-popup-icon" aria-hidden />
        <p id="hw-accel-title" className="hw-accel-popup-title">
          {t("hardwareAccel.title")}
        </p>
        <button
          type="button"
          className="hw-accel-popup-dismiss"
          onClick={dismiss}
          aria-label={t("hardwareAccel.dismiss")}
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="hw-accel-popup-body">{t(messageKey)}</p>
      <p className="hw-accel-popup-hint">{t("hardwareAccel.hint")}</p>
    </aside>,
    document.body,
  );
}
