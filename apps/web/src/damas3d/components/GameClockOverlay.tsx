import { Pause, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GameState } from "@sol-tictactoe/shared";
import { cn } from "@/lib/utils";

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ClockChipProps {
  color: "w" | "b";
  roleLabel: string;
  timeMs: number;
  active: boolean;
  paused: boolean;
  isMe: boolean;
  incrementSec?: number;
}

function ClockChip({
  color,
  roleLabel,
  timeMs,
  active,
  paused,
  isMe,
  incrementSec,
}: ClockChipProps) {
  const low = timeMs > 0 && timeMs <= 30_000;

  return (
    <div
      className={cn(
        "damas3d-clock-chip",
        active && "damas3d-clock-chip-active",
        low && active && "damas3d-clock-chip-low",
        isMe && "damas3d-clock-chip-me",
      )}
      aria-live={active ? "polite" : "off"}
      aria-label={`${roleLabel} ${formatClock(timeMs)}`}
    >
      <span
        className={cn(
          "damas3d-clock-color",
          color === "w" ? "damas3d-clock-color-white" : "damas3d-clock-color-black",
        )}
        aria-hidden
      />
      <div className="damas3d-clock-meta">
        <span className="damas3d-clock-label">
          {paused && active ? (
            <Pause className="size-2.5 inline -mt-px mr-0.5" aria-hidden />
          ) : (
            <Timer className="size-2.5 inline -mt-px mr-0.5" aria-hidden />
          )}
          {roleLabel}
        </span>
        <span className="damas3d-clock-time">
          {formatClock(timeMs)}
          {incrementSec != null && incrementSec > 0 && (
            <span className="damas3d-clock-increment">+{incrementSec}</span>
          )}
        </span>
      </div>
    </div>
  );
}

interface GameClockOverlayProps {
  game: GameState;
  myColor: "w" | "b" | null;
}

export function GameClockOverlay({ game, myColor }: GameClockOverlayProps) {
  const { t } = useTranslation();
  const paused = Boolean(game.disconnectedPlayer);
  const mySide = myColor ?? "w";
  const opponentSide = mySide === "w" ? "b" : "w";

  const incrementSec =
    game.incrementMs != null && game.incrementMs > 0
      ? Math.round(game.incrementMs / 1000)
      : undefined;

  const propsFor = (color: "w" | "b", isMe: boolean) => ({
    color,
    roleLabel: isMe ? t("damas3d.clockYou") : t("damas3d.clockOpponent"),
    timeMs: color === "w" ? game.whiteTimeMs : game.blackTimeMs,
    active: game.status === "playing" && game.turn === color && !paused,
    paused: paused && game.turn === color,
    isMe,
    incrementSec,
  });

  return (
    <div className="damas3d-clocks-bar">
      <ClockChip {...propsFor(opponentSide, false)} />
      <ClockChip {...propsFor(mySide, true)} />
    </div>
  );
}
