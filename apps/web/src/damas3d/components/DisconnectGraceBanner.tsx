import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AlertTriangle, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GameState } from "@sol-tictactoe/shared";
import { formatGraceRemainingMs } from "@/lib/graceTime";
import { cn } from "@/lib/utils";

interface DisconnectGraceBannerProps {
  game: GameState;
  playerId?: string;
  className?: string;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.25, ease: [0.4, 0, 0.6, 1] as const },
  },
};

export function DisconnectGraceBanner({
  game,
  playerId,
  className,
}: DisconnectGraceBannerProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());

  const show = Boolean(game.disconnectedPlayer && game.reconnectDeadlineMs);

  useEffect(() => {
    if (!show) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [show]);

  const remainingMs = show
    ? Math.max(0, game.reconnectDeadlineMs! - now)
    : 0;
  const time = formatGraceRemainingMs(remainingMs);
  const iLeft = game.disconnectedPlayer === playerId;
  const urgent = remainingMs <= 30_000 && remainingMs > 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="disconnect-grace"
          className={cn("damas3d-disconnect-overlay", className)}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="disconnect-grace-title"
          aria-describedby="disconnect-grace-body"
        >
          <motion.div
            className={cn(
              "damas3d-disconnect-modal",
              iLeft
                ? "damas3d-disconnect-modal-self"
                : "damas3d-disconnect-modal-opponent",
              urgent && "damas3d-disconnect-modal-urgent",
            )}
            variants={cardVariants}
          >
            <div className="damas3d-disconnect-modal-icon" aria-hidden>
              {iLeft ? (
                <WifiOff className="size-8" strokeWidth={2} />
              ) : (
                <AlertTriangle className="size-8" strokeWidth={2} />
              )}
            </div>

            <h2 id="disconnect-grace-title" className="damas3d-disconnect-modal-title">
              {iLeft
                ? t("damas3d.disconnectSelfTitle")
                : t("damas3d.disconnectOpponentTitle")}
            </h2>

            <p id="disconnect-grace-body" className="damas3d-disconnect-modal-body">
              {iLeft
                ? t("damas3d.disconnectSelfBody", { time })
                : t("damas3d.disconnectOpponentBody", { time })}
            </p>

            <div className="damas3d-disconnect-modal-timer-wrap">
              <span className="damas3d-disconnect-modal-timer-label">
                {t("damas3d.disconnectTimerLabel")}
              </span>
              <span
                className={cn(
                  "damas3d-disconnect-modal-timer font-mono",
                  urgent && "damas3d-disconnect-modal-timer-urgent",
                )}
                aria-live="polite"
                aria-atomic="true"
              >
                {time}
              </span>
            </div>

            {!iLeft && (
              <p className="damas3d-disconnect-modal-footnote">
                {t("damas3d.disconnectOpponentFootnote")}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
