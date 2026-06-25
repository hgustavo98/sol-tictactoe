import { useTranslation } from "react-i18next";
import { BrandLogo } from "../components/icons/BrandLogo";

interface XttBrandHeroProps {
  compact?: boolean;
}

export function XttBrandHero({ compact = false }: XttBrandHeroProps) {
  const { t } = useTranslation();

  return (
    <header className={compact ? "xtt-brand xtt-brand-compact" : "xtt-brand"}>
      <div className="xtt-brand-glow" aria-hidden>
        <BrandLogo size={compact ? 40 : 64} decorative />
      </div>
      <h1 className="xtt-brand-title">{t("app.title")}</h1>
      {!compact && <p className="xtt-brand-tagline">{t("app.tagline")}</p>}
    </header>
  );
}
