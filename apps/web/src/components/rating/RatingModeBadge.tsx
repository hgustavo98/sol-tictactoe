import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, HelpCircle, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_RATING,
  formatEloDelta,
  previewEloDeltas,
} from "@sol-tictactoe/shared";
import { cn } from "@/lib/utils";

interface RatingModeBadgeProps {
  countsForRating: boolean;
  variant?: "default" | "compact";
  className?: string;
  myRating?: number;
  myGamesPlayed?: number;
  opponentRating?: number | null;
  isTournament?: boolean;
  ratingMultiplier?: number;
}

interface EloHelpTooltipProps {
  open: boolean;
  position: { top: number; left: number };
  children: React.ReactNode;
}

function EloHelpTooltip({ open, position, children }: EloHelpTooltipProps) {
  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <div
      className="elo-help-tooltip elo-help-tooltip-portal"
      role="tooltip"
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function RatingModeBadge({
  countsForRating,
  variant = "default",
  className,
  myRating,
  myGamesPlayed = 0,
  opponentRating,
  isTournament = false,
  ratingMultiplier = 1,
}: RatingModeBadgeProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const updateTooltipPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxWidth = Math.min(256, window.innerWidth * 0.7);
    let left = rect.left + rect.width / 2 - maxWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - maxWidth - 8));
    setTooltipPos({ top: rect.top - 8, left });
  }, []);

  const showTooltip = useCallback(() => {
    updateTooltipPosition();
    setTooltipOpen(true);
  }, [updateTooltipPosition]);

  const hideTooltip = useCallback(() => {
    setTooltipOpen(false);
  }, []);

  useEffect(() => {
    if (!tooltipOpen) return;
    const onReposition = () => updateTooltipPosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [tooltipOpen, updateTooltipPosition]);

  if (!countsForRating) {
    return (
      <span
        className={cn(
          "rating-mode-badge",
          variant === "compact" && "rating-mode-badge-compact",
          "rating-mode-badge-no",
          className,
        )}
        title={t("arena.ratingNoCountHint")}
      >
        <Ban className="size-3 shrink-0" aria-hidden />
        <span>{t("arena.ratingNoCount")}</span>
      </span>
    );
  }

  const rating = myRating ?? DEFAULT_RATING;
  const opp =
    opponentRating != null && opponentRating > 0 ? opponentRating : rating;
  const hasOpponent = opponentRating != null && opponentRating > 0;
  const preview = previewEloDeltas(
    rating,
    opp,
    myGamesPlayed,
    ratingMultiplier,
  );

  return (
    <span
      className={cn(
        "rating-mode-badge",
        variant === "compact" && "rating-mode-badge-compact",
        "rating-mode-badge-yes",
        "rating-mode-badge-preview-wrap",
        className,
      )}
    >
      <TrendingUp className="size-3 shrink-0" aria-hidden />
      <span className="rating-mode-badge-preview">
        {t("elo.compactWin", { delta: formatEloDelta(preview.win) })}
        <span className="rating-mode-badge-preview-sep" aria-hidden>
          ·
        </span>
        {t("elo.compactLoss", { delta: formatEloDelta(preview.loss) })}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="elo-help-trigger"
        aria-label={t("elo.helpLabel")}
        aria-expanded={tooltipOpen}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        <HelpCircle className="size-3 shrink-0" aria-hidden />
      </button>
      <EloHelpTooltip open={tooltipOpen} position={tooltipPos}>
        <span className="elo-help-tooltip-line elo-help-tooltip-context">
          {hasOpponent
            ? t("elo.previewVsOpponent", { yours: rating, theirs: opp })
            : t("elo.previewVsSimilar", { rating })}
        </span>
        <span className="elo-help-tooltip-line">
          {t("elo.draw")} {formatEloDelta(preview.draw)}
        </span>
        <span className="elo-help-tooltip-line">{t("elo.notSymmetric")}</span>
          <span className="elo-help-tooltip-line">
            {t("elo.kFactor", { k: preview.k })}
            {" · "}
            {t("elo.maxSwing", { k: preview.k })}
          </span>
          {ratingMultiplier !== 1 && (
            <span className="elo-help-tooltip-line">
              {isTournament
                ? t("elo.tournamentMultiplier", {
                    multiplier: ratingMultiplier.toFixed(2),
                  })
                : t("elo.stakeMultiplier", {
                    multiplier: ratingMultiplier.toFixed(2),
                  })}
            </span>
          )}
          {isTournament && (
          <span className="elo-help-tooltip-line elo-help-tooltip-tournament">
            {t("elo.tournamentNote")}
          </span>
        )}
      </EloHelpTooltip>
    </span>
  );
}
