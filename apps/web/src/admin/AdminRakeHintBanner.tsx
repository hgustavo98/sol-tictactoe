import {
  CASUAL_RAKE_BPS,
  CUSTOM_RAKE_BPS,
  RANKED_RAKE_BPS,
  TOURNAMENT_RAKE_BPS,
} from "@sol-tictactoe/shared";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

function bpsToPct(bps: number): string {
  return String(bps / 100);
}

export function AdminRakeHintBanner() {
  const { t } = useTranslation();

  const modes = [
    { key: "casual", label: t("openTables.mode.casual"), bps: CASUAL_RAKE_BPS },
    { key: "ranked", label: t("openTables.mode.ranked"), bps: RANKED_RAKE_BPS },
    { key: "custom", label: t("openTables.mode.custom"), bps: CUSTOM_RAKE_BPS },
    {
      key: "tournament",
      label: t("openTables.mode.tournament"),
      bps: TOURNAMENT_RAKE_BPS,
    },
  ];

  return (
    <aside
      className="admin-info-banner"
      role="note"
      aria-labelledby="admin-rake-hint-title"
    >
      <div className="admin-info-banner-inner">
        <Info className="admin-info-banner-icon" aria-hidden />
        <div className="admin-info-banner-content">
          <p id="admin-rake-hint-title" className="admin-info-banner-title">
            {t("admin.rakeBpsBannerTitle")}
          </p>
          <p className="admin-info-banner-body">{t("admin.rakeBpsBannerBody")}</p>
          <div className="admin-info-banner-pills">
            {modes.map(({ key, label, bps }) => (
              <span key={key} className="admin-info-banner-pill">
                {t("admin.rakeBpsBannerMode", {
                  mode: label,
                  pct: bpsToPct(bps),
                })}
              </span>
            ))}
          </div>
          <p className="admin-info-banner-footnote">
            {t("admin.rakeBpsBannerFootnote")}
          </p>
        </div>
      </div>
    </aside>
  );
}
