import { type ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LobbyMatch } from "@sol-tictactoe/shared";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  arenaPrizeSol,
  BET_ARENAS,
  clampBetSol,
  formatSolAmount,
  lobbiesForBet,
  MAX_BET_SOL,
  MIN_BET_SOL,
  validateBetSol,
  type BetErrorKey,
} from "../../config/bets";

type BetArena = { id: string; name: string; subtitle: string; betSol: number };
import { SolAmount, SolanaIcon } from "@/components/icons/SolanaIcon";

interface BetArenaCarouselProps {
  houseRakeBps: number;
  lobbies: LobbyMatch[];
  selectedBetSol: number;
  onSelectBet: (betSol: number) => void;
  customMode: boolean;
  onCustomModeChange: (custom: boolean) => void;
}

type Slide = BetArena | "custom";

const SPRING = { type: "spring" as const, stiffness: 340, damping: 32, mass: 0.85 };

function wrapOffset(i: number, active: number, total: number): number {
  let diff = i - active;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

export function BetArenaCarousel({
  houseRakeBps,
  lobbies,
  selectedBetSol,
  onSelectBet,
  customMode,
  onCustomModeChange,
}: BetArenaCarouselProps) {
  const { t } = useTranslation();
  const slides: Slide[] = [...BET_ARENAS, "custom"];
  const [index, setIndex] = useState(0);
  const [customInput, setCustomInput] = useState(
    formatSolAmount(selectedBetSol),
  );
  const [customError, setCustomError] = useState<BetErrorKey | null>(null);

  const selectIndex = (next: number) => {
    const wrapped =
      ((next % slides.length) + slides.length) % slides.length;
    setIndex(wrapped);
    const s = slides[wrapped];
    if (s === "custom") onCustomModeChange(true);
    else {
      onCustomModeChange(false);
      onSelectBet(s.betSol);
    }
  };

  const go = (dir: -1 | 1) => selectIndex(index + dir);

  const applyCustom = (raw: string) => {
    setCustomInput(raw);
    const parsed = parseFloat(raw.replace(",", "."));
    const err = validateBetSol(parsed);
    setCustomError(err);
    if (!err) onSelectBet(clampBetSol(parsed));
  };

  return (
    <div className="arena-carousel">
      <Button
        type="button"
        variant="arena"
        size="icon"
        onClick={() => go(-1)}
        aria-label={t("arena.prev")}
        className="arena-arrow z-20 shrink-0 h-9 w-9"
      >
        <ChevronLeft className="size-5" />
      </Button>

      <div className="arena-stage">
        {slides.map((slide, i) => {
          const offset = wrapOffset(i, index, slides.length);
          if (Math.abs(offset) > 2) return null;

          const isCenter = offset === 0;
          const betSol =
            slide === "custom"
              ? selectedBetSol
              : slide.betSol;
          const prize = arenaPrizeSol(betSol, houseRakeBps);
          const online = lobbiesForBet(lobbies, betSol);
          const key = slide === "custom" ? "custom" : slide.id;

          return (
            <motion.div
              key={key}
              className="arena-slide"
              initial={false}
              animate={{
                x: `calc(-50% + ${offset * 60}%)`,
                y: "-50%",
                scale: isCenter ? 1 : 0.78,
                opacity:
                  Math.abs(offset) === 2
                    ? 0.25
                    : isCenter
                      ? 1
                      : 0.65,
                zIndex: 10 - Math.abs(offset),
              }}
              transition={SPRING}
              onClick={() => {
                if (offset === -1) go(-1);
                else if (offset === 1) go(1);
                else if (isCenter && slide !== "custom") {
                  onCustomModeChange(false);
                  onSelectBet(slide.betSol);
                }
              }}
              style={{ pointerEvents: Math.abs(offset) <= 1 ? "auto" : "none" }}
            >
              <div
                className={cn(
                  "arena-card",
                  isCenter && "arena-card-center",
                  !isCenter && "arena-card-side cursor-pointer",
                )}
              >
                {slide === "custom" ? (
                  <ArenaCardBody
                    badge={t("arena.badgeCustom")}
                    title={t("arena.customTitle")}
                    subtitle={t("arena.customSubtitle")}
                    prize={prize}
                    online={online}
                    compact={!isCenter}
                  >
                    {isCenter && (
                      <div className="arena-custom-input-row space-y-2">
                        <label
                          htmlFor="custom-bet"
                          className="text-xs uppercase tracking-wider text-muted-foreground"
                        >
                          {t("arena.entryFee")}
                        </label>
                        <div className="arena-input-wrap">
                          <SolanaIcon className="size-4" title="SOL" />
                          <Input
                            id="custom-bet"
                            type="number"
                            min={MIN_BET_SOL}
                            step={0.001}
                            value={customInput}
                            className="h-9 max-w-[120px] border-0 bg-transparent text-center text-lg text-foreground shadow-none focus-visible:ring-0"
                            onChange={(e) => {
                              onCustomModeChange(true);
                              applyCustom(e.target.value);
                            }}
                            onFocus={() => onCustomModeChange(true)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <p className="arena-min-hint">
                          {t("arena.minSol", { min: MIN_BET_SOL })}
                        </p>
                        {customError && (
                          <p className="text-xs text-destructive">
                            {t(`errors.bet.${customError}`, {
                              min: MIN_BET_SOL,
                              max: MAX_BET_SOL,
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </ArenaCardBody>
                ) : (
                  <ArenaCardBody
                    badge={t("arena.badge1v1")}
                    title={t(`arenas.${slide.id}.name`)}
                    subtitle={t(`arenas.${slide.id}.subtitle`)}
                    prize={prize}
                    online={online}
                    entrySol={slide.betSol}
                    compact={!isCenter}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="arena"
        size="icon"
        onClick={() => go(1)}
        aria-label={t("arena.next")}
        className="arena-arrow z-20 shrink-0 h-9 w-9"
      >
        <ChevronRight className="size-5" />
      </Button>

      <div className="arena-dots">
        {slides.map((s, i) => (
          <button
            key={s === "custom" ? "custom" : s.id}
            type="button"
            className={cn("arena-dot", i === index && "arena-dot-active")}
            onClick={() => selectIndex(i)}
            aria-label={t("arena.slide", { n: i + 1 })}
          />
        ))}
      </div>
    </div>
  );
}

function ArenaCardBody({
  badge,
  title,
  subtitle,
  prize,
  online,
  entrySol,
  compact,
  children,
}: {
  badge: string;
  title: string;
  subtitle: string;
  prize: number;
  online: number;
  entrySol?: number;
  compact?: boolean;
  children?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn("arena-card-inner", compact && "arena-card-inner-compact")}>
      <div className="arena-card-header">
        <Badge variant="outline" className="mb-2 border-primary/40 text-primary">
          {badge}
        </Badge>
        <h2 className="arena-title">{title}</h2>
        {!compact && <p className="arena-subtitle">{subtitle}</p>}
      </div>

      {!compact && (
        <>
          <div className="arena-prize-block">
            <span className="arena-prize-label">{t("arena.prize")}</span>
            <div className="arena-prize-value">
              <SolAmount amount={formatSolAmount(prize)} iconClassName="size-4" />
            </div>
          </div>

          <div className="arena-stats">
            <div>{t("arena.waiting", { count: online })}</div>
            {entrySol != null ? (
              <div className="arena-entry">
                {t("arena.entry")}{" "}
                <strong>
                  <SolAmount amount={formatSolAmount(entrySol)} iconClassName="size-3.5" />
                </strong>
              </div>
            ) : (
              children
            )}
          </div>
        </>
      )}

      {compact && entrySol != null && (
        <div className="arena-entry-compact">
          <SolAmount amount={formatSolAmount(entrySol)} iconClassName="size-3.5" />
        </div>
      )}
      {compact && entrySol == null && (
        <div className="arena-entry-compact">{t("arena.custom")}</div>
      )}
    </div>
  );
}
