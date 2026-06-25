import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameState } from "@sol-tictactoe/shared";
import { Button } from "@/components/ui/button";

function formatGrace(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ActiveMatchBannerProps {
  gameState: GameState | null | undefined;
  playerId?: string;
  onRejoin: () => void;
}

export function ActiveMatchBanner({
  gameState,
  playerId,
  onRejoin,
}: ActiveMatchBannerProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!gameState || gameState.status !== "playing" || !playerId) return null;

  const deadline = gameState.reconnectDeadlineMs;
  const remaining = deadline ? deadline - now : null;
  const youLeft = gameState.disconnectedPlayer === playerId;
  const opponentLeft =
    gameState.disconnectedPlayer &&
    gameState.disconnectedPlayer !== playerId;

  return (
    <div className="active-match-banner">
      <div className="active-match-banner-inner">
        <p className="active-match-banner-title">{t("match.rejoinTitle")}</p>
        <p className="active-match-banner-body">
          {youLeft
            ? t("match.youDisconnected", {
                time: remaining != null ? formatGrace(remaining) : "1:00",
              })
            : opponentLeft
              ? t("match.opponentDisconnected", {
                  time: remaining != null ? formatGrace(remaining) : "1:00",
                })
              : t("match.rejoinBody")}
        </p>
        <Button type="button" size="sm" onClick={onRejoin}>
          {t("match.rejoinButton")}
        </Button>
      </div>
    </div>
  );
}
