import { useState } from "react";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DonateModal } from "./DonateModal";

export function DonateButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="donate-heart-btn"
        onClick={() => setOpen(true)}
        aria-label={t("donate.open")}
        title={t("donate.open")}
      >
        <Heart className="donate-heart-icon size-4" aria-hidden />
      </button>
      <DonateModal open={open} onOpenChange={setOpen} />
    </>
  );
}
