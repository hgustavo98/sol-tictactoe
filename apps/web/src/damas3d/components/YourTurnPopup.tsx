import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { displayPlayerName } from "@sol-tictactoe/shared";
import type { PlayerProfile } from "@sol-tictactoe/shared";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";

/** Tempo visível antes do fade de saída. */
const HOLD_MS = 1800;

export type TurnActorProfile = Pick<
  PlayerProfile,
  "wallet" | "nickname" | "avatarUrl"
>;

/**
 * Dispara um pulso em cada mudança de turno (inclui início da partida).
 */
export function useTurnChangePulse(
  turn: "w" | "b",
  active = true,
) {
  const [pulse, setPulse] = useState(0);
  const prevTurnRef = useRef<"w" | "b" | null>(null);

  useEffect(() => {
    if (!active) {
      prevTurnRef.current = null;
      return;
    }

    if (prevTurnRef.current === null) {
      prevTurnRef.current = turn;
      setPulse((n) => n + 1);
      return;
    }

    if (prevTurnRef.current !== turn) {
      prevTurnRef.current = turn;
      setPulse((n) => n + 1);
    }
  }, [turn, active]);

  return pulse;
}

/** @deprecated Use useTurnChangePulse */
export function useYourTurnPulse(isMyTurn: boolean, active = true) {
  const [pulse, setPulse] = useState(0);
  const prevRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!active) return;
    const wasMyTurn = prevRef.current === true;
    if (isMyTurn && !wasMyTurn) {
      setPulse((n) => n + 1);
    }
    prevRef.current = isMyTurn;
  }, [isMyTurn, active]);

  return pulse;
}

const wakeVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    filter: "blur(8px)",
    y: -8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    filter: "blur(6px)",
    y: -6,
    transition: {
      duration: 0.35,
      ease: [0.4, 0, 0.6, 1] as const,
    },
  },
};

export interface TurnNoticePopupProps {
  pulse: number;
  isMyTurn: boolean;
  actor?: TurnActorProfile | null;
  actorLabel?: string;
}

export function TurnNoticePopup({
  pulse,
  isMyTurn,
  actor,
  actorLabel,
}: TurnNoticePopupProps) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const name =
    actorLabel ??
    displayPlayerName(actor ?? null, t("profile.guest"));

  const message = isMyTurn
    ? t("damas3d.yourTurn")
    : t("damas3d.opponentTurnName", { name });

  useEffect(() => {
    if (pulse <= 0) return;

    setShow(true);

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setShow(false);
      hideTimerRef.current = null;
    }, HOLD_MS);

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [pulse]);

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key={pulse}
          className="damas3d-your-turn"
          variants={wakeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              "damas3d-turn-notice",
              isMyTurn
                ? "damas3d-turn-notice-yours"
                : "damas3d-turn-notice-opponent",
            )}
          >
            <PlayerAvatar
              profile={actor ?? undefined}
              size="lg"
              className="damas3d-turn-notice-avatar"
            />
            <span className="damas3d-your-turn-text">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
