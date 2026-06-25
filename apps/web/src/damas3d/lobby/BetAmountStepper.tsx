import type { MouseEvent, PointerEvent } from "react";
import { Minus, Plus } from "lucide-react";
import {
  clampBetSol,
  clampRankedBetSol,
  CUSTOM_MIN_BET_SOL,
  CUSTOM_MAX_BET_SOL,
  formatSolAmount,
  RANKED_MIN_BET_SOL,
  RANKED_MAX_BET_SOL,
} from "../../config/bets";
import {
  betStepBtn,
  betStepBtnCustom,
  betStepField,
  betStepFieldCustom,
  betStepperRoot,
  betStepperRootCustom,
} from "./lobbyClasses";

type BetStepperVariant = "default" | "custom" | "ranked";

interface BetAmountStepperProps {
  value: string;
  onChange: (raw: string) => void;
  step?: number;
  variant?: BetStepperVariant;
  onPointerDown?: (e: { stopPropagation: () => void }) => void;
}

function stepperBounds(variant: BetStepperVariant) {
  if (variant === "ranked") {
    return {
      min: RANKED_MIN_BET_SOL,
      max: RANKED_MAX_BET_SOL,
      clamp: clampRankedBetSol,
    };
  }
  return {
    min: CUSTOM_MIN_BET_SOL,
    max: CUSTOM_MAX_BET_SOL,
    clamp: clampBetSol,
  };
}

export function BetAmountStepper({
  value,
  onChange,
  step = 0.005,
  variant = "default",
  onPointerDown,
}: BetAmountStepperProps) {
  const bounds = stepperBounds(variant === "default" ? "custom" : variant);
  const parsed = parseFloat(value.replace(",", "."));
  const current = Number.isNaN(parsed) ? bounds.min : parsed;

  const adjust = (delta: number) => {
    const next = bounds.clamp(current + delta);
    onChange(formatSolAmount(next));
  };

  const stop = (e: MouseEvent | PointerEvent) => {
    e.stopPropagation();
    onPointerDown?.(e);
  };

  const atMin = current <= bounds.min + 1e-9;
  const atMax = current >= bounds.max - 1e-9;
  const isCustom = variant === "custom" || variant === "ranked";

  return (
    <div
      className={isCustom ? betStepperRootCustom : betStepperRoot}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={isCustom ? betStepBtnCustom : betStepBtn}
        disabled={atMin}
        aria-label="Diminuir aposta"
        onPointerDown={stop}
        onClick={() => adjust(-step)}
      >
        <Minus className="size-3.5" strokeWidth={2.75} />
      </button>

      <input
        type="text"
        inputMode="decimal"
        value={value}
        className={isCustom ? betStepFieldCustom : betStepField}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={stop}
        aria-label="Valor da aposta em SOL"
      />

      <button
        type="button"
        className={isCustom ? betStepBtnCustom : betStepBtn}
        disabled={atMax}
        aria-label="Aumentar aposta"
        onPointerDown={stop}
        onClick={() => adjust(step)}
      >
        <Plus className="size-3.5" strokeWidth={2.75} />
      </button>
    </div>
  );
}
