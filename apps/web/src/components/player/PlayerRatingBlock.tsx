import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  displayPlayerName,
  ratingTierId,
  type PlayerProfile,
  type RatingTierId,
} from "@sol-tictactoe/shared";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "./PlayerAvatar";

const TIER_ACCENT: Record<RatingTierId, string> = {
  rookie: "#95a5a6",
  intermediate: "#ff8c42",
  expert: "#ff6b35",
  master: "#e63946",
  grandmaster: "#ffb347",
};

const TIER_FLOOR: Record<RatingTierId, number> = {
  rookie: 0,
  intermediate: 450,
  expert: 600,
  master: 750,
  grandmaster: 900,
};

const TIER_CEILING: Record<RatingTierId, number> = {
  rookie: 450,
  intermediate: 600,
  expert: 750,
  master: 900,
  grandmaster: 1200,
};

const OPPONENT_ACCENT = "#e74c3c";

function tierProgress(rating: number) {
  const tier = ratingTierId(rating);
  const floor = TIER_FLOOR[tier];
  const ceiling = TIER_CEILING[tier];
  const pct = Math.min(
    100,
    Math.max(0, ((rating - floor) / (ceiling - floor)) * 100),
  );
  return { tier, pct, nextAt: tier === "grandmaster" ? null : ceiling };
}

export interface PlayerRatingBlockProps {
  profile: PlayerProfile;
  variant?: "full" | "compact";
  tone?: "player" | "opponent";
  label?: string;
  showIdentity?: boolean;
}

export function PlayerRatingBlock({
  profile,
  variant = "full",
  tone = "player",
  label,
  showIdentity = false,
}: PlayerRatingBlockProps) {
  const { t } = useTranslation();
  const { tier, pct, nextAt } = tierProgress(profile.rating);
  const tierAccent = TIER_ACCENT[tier];
  const compact = variant === "compact";
  const name = displayPlayerName(profile, t("profile.guest"));

  return (
    <div
      className={cn(
        "profile-rating-block",
        compact && "profile-rating-compact",
        tone === "opponent" && "profile-rating-block-opponent",
      )}
      style={
        {
          "--tier-accent": tierAccent,
          borderColor:
            tone === "opponent" ? `${OPPONENT_ACCENT}55` : `${tierAccent}44`,
        } as CSSProperties
      }
    >
      {label && (
        <span className="profile-rating-block-label">{label}</span>
      )}

      {showIdentity && (
        <div className="profile-rating-identity">
          <PlayerAvatar profile={profile} size="sm" />
          <span className="profile-rating-identity-name truncate">{name}</span>
        </div>
      )}

      <div className="profile-rating-header">
        <div className="profile-rating-main">
          <span className="profile-rating-label">{t("profile.rating")}</span>
          <span
            className={cn(
              "profile-rating-value",
              compact && "profile-rating-value-compact",
            )}
          >
            {profile.rating}
          </span>
        </div>
        <span
          className={cn(
            "profile-tier-badge",
            compact && "profile-tier-badge-compact",
          )}
          data-tier={tier}
        >
          {t(`rating.tiers.${tier}`)}
        </span>
      </div>

      <div
        className={cn(
          "profile-rating-progress",
          compact && "profile-rating-progress-compact",
        )}
      >
        <div className="profile-rating-progress-track">
          <div
            className="profile-rating-progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="profile-rating-progress-label">
          {nextAt != null
            ? t("profile.nextTier", { rating: nextAt })
            : t("profile.maxTier")}
        </p>
      </div>

      <div
        className={cn(
          "profile-record",
          compact && "profile-record-compact",
        )}
      >
        <div className="profile-record-item">
          <span className="profile-record-value profile-record-wins">
            {profile.wins}
          </span>
          <span className="profile-record-label">{t("profile.wins")}</span>
        </div>
        <div className="profile-record-item">
          <span className="profile-record-value profile-record-losses">
            {profile.losses}
          </span>
          <span className="profile-record-label">{t("profile.losses")}</span>
        </div>
        <div className="profile-record-item">
          <span className="profile-record-value">{profile.draws}</span>
          <span className="profile-record-label">{t("profile.draws")}</span>
        </div>
      </div>
    </div>
  );
}
