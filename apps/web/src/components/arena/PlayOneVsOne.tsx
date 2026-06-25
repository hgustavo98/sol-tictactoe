import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { CirclePlay, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { fadeUp } from "@/components/motion/ViewTransition";
import { formatSolAmount } from "../../config/bets";
import { SolAmount } from "@/components/icons/SolanaIcon";

interface PlayOneVsOneProps {
  disabled?: boolean;
  loading?: boolean;
  onPlay: () => void;
  betLabel: ReactNode;
}

export function PlayOneVsOne({
  disabled,
  loading,
  onPlay,
  betLabel,
}: PlayOneVsOneProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      transition={{ delay: 0.1 }}
      className="play-1v1-section"
    >
      <Button
        type="button"
        variant="play"
        size="lg"
        disabled={disabled || loading}
        onClick={onPlay}
        className="w-full max-w-xs mx-auto flex-col gap-0.5 py-3 h-auto"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            {t("play.starting")}
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-1.5">
            <CirclePlay className="size-4 shrink-0" aria-hidden />
            {t("play.title")}
          </span>
        )}
        <span className="font-mono text-xs font-normal opacity-80">
          {betLabel}
        </span>
      </Button>
      <p className="play-1v1-hint">{t("play.hint")}</p>
    </motion.div>
  );
}

export function formatPlayEntryLabel(betSol: number): ReactNode {
  return (
    <SolAmount
      amount={formatSolAmount(betSol)}
      suffix
      iconClassName="size-3.5"
      className="font-mono text-xs font-normal opacity-80"
    />
  );
}
