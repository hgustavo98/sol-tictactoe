import { useTranslation } from "react-i18next";
import { ArrowRight, Percent, Trophy } from "lucide-react";
import {
  lamportsToSol,
  type BetBreakdown,
} from "@sol-tictactoe/shared";
import { cn } from "@/lib/utils";
import { formatSolAmount } from "../../config/bets";
import { SolAmount } from "@/components/icons/SolanaIcon";

interface ProfileStakesCardProps {
  breakdown: BetBreakdown;
  variant?: "card" | "inline";
  className?: string;
}

export function ProfileStakesCard({
  breakdown,
  variant = "card",
  className,
}: ProfileStakesCardProps) {
  const { t } = useTranslation();
  const isFree = breakdown.betLamports === 0;

  if (isFree) {
    return (
      <div
        className={cn(
          variant === "inline"
            ? "profile-stakes-inline profile-stakes-inline-free"
            : "profile-stakes-card profile-stakes-card-free",
          className,
        )}
      >
        <span className="profile-stakes-free-label">{t("profile.freeMatch")}</span>
      </div>
    );
  }

  const entrySol = formatSolAmount(lamportsToSol(breakdown.betLamports));
  const potSol = formatSolAmount(lamportsToSol(breakdown.potLamports));
  const rakeSol = formatSolAmount(lamportsToSol(breakdown.rakeLamports));
  const prizeSol = formatSolAmount(lamportsToSol(breakdown.maxPayoutLamports));

  if (variant === "inline") {
    return (
      <div className={cn("profile-stakes-inline", className)}>
        <div className="profile-stakes-inline-item">
          <span className="profile-stakes-inline-label">{t("profile.entryEach")}</span>
          <SolAmount amount={entrySol} suffix iconClassName="size-3" />
        </div>
        <ArrowRight className="profile-stakes-inline-arrow size-3" aria-hidden />
        <div className="profile-stakes-inline-item profile-stakes-inline-prize">
          <span className="profile-stakes-inline-label">{t("profile.prizeWin")}</span>
          <SolAmount
            amount={prizeSol}
            suffix
            iconClassName="size-3"
            className="profile-stakes-prize-value"
          />
        </div>
        <div className="profile-stakes-inline-rake">
          <Percent className="size-2.5" aria-hidden />
          {breakdown.rakePercent}%
        </div>
      </div>
    );
  }

  return (
    <div className={cn("profile-stakes-card", className)}>
      <div className="profile-stakes-card-head">
        <Trophy className="size-3.5 text-gold" aria-hidden />
        <span>{t("profile.stakesTitle")}</span>
      </div>

      <div className="profile-stakes-grid">
        <div className="profile-stakes-row">
          <span className="profile-stakes-label">{t("profile.entryEach")}</span>
          <SolAmount
            amount={entrySol}
            suffix
            iconClassName="size-3.5"
            className="profile-stakes-value"
          />
        </div>

        <div className="profile-stakes-row">
          <span className="profile-stakes-label">{t("profile.pot")}</span>
          <SolAmount
            amount={potSol}
            suffix
            iconClassName="size-3.5"
            className="profile-stakes-value"
          />
        </div>

        <div className="profile-stakes-row profile-stakes-row-rake">
          <span className="profile-stakes-label">
            {t("profile.rake", { percent: breakdown.rakePercent })}
          </span>
          <SolAmount
            amount={rakeSol}
            suffix
            iconClassName="size-3"
            className="profile-stakes-value profile-stakes-value-muted"
          />
        </div>
      </div>

      <div className="profile-stakes-prize-block">
        <span className="profile-stakes-prize-label">{t("profile.prizeWin")}</span>
        <SolAmount
          amount={prizeSol}
          suffix
          iconClassName="size-4"
          className="profile-stakes-prize-value"
        />
      </div>
    </div>
  );
}
