import { useState } from "react";
import { Flag, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GameState } from "@sol-tictactoe/shared";
import { computeBetBreakdown } from "@sol-tictactoe/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trainingBtn } from "../../damas3d/lobby/lobbyClasses";
import { ResignConfirmDialog } from "../ResignConfirmDialog";
import { ProfileStakesCard } from "./ProfileStakesCard";

interface GameActionRailProps {
  game?: GameState | null;
  playerId?: string;
  onOpenRules: () => void;
  onResign?: () => void;
}

export function GameActionRail({
  game,
  playerId,
  onOpenRules,
  onResign,
}: GameActionRailProps) {
  const { t } = useTranslation();
  const [resignOpen, setResignOpen] = useState(false);

  const myColor =
    game && playerId
      ? playerId === game.playerWhite
        ? "w"
        : playerId === game.playerBlack
          ? "b"
          : null
      : null;

  const showResign =
    Boolean(onResign) &&
    game?.status === "playing" &&
    Boolean(myColor);

  const breakdown = game
    ? computeBetBreakdown(game.betLamports, game.rakeBps)
    : null;

  return (
    <aside className="game-bottom-left-actions">
      {breakdown && (
        <ProfileStakesCard
          breakdown={breakdown}
          variant="inline"
          className="game-bottom-left-stakes"
        />
      )}

      <button
        type="button"
        onClick={onOpenRules}
        className={cn(trainingBtn, "game-bottom-left-btn")}
        aria-label={t("profile.rules.button")}
      >
        <ScrollText className="size-4 shrink-0 text-amber-300" strokeWidth={2.25} />
        {t("profile.rules.button")}
      </button>

      {showResign && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="game-bottom-left-btn game-bottom-left-resign w-full"
          onClick={() => setResignOpen(true)}
        >
          <Flag className="size-3.5" />
          {t("profile.resign")}
        </Button>
      )}

      {onResign && (
        <ResignConfirmDialog
          open={resignOpen}
          onOpenChange={setResignOpen}
          onConfirm={onResign}
          hasBet={(game?.betLamports ?? 0) > 0}
        />
      )}
    </aside>
  );
}
