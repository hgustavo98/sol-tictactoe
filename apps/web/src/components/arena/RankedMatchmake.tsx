import { Loader2, Swords } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { MatchmakeStatusPayload } from "@sol-tictactoe/shared";
import { fadeUp } from "@/components/motion/ViewTransition";

interface RankedMatchmakeProps {
  disabled?: boolean;
  loading?: boolean;
  queued: boolean;
  status: MatchmakeStatusPayload | null;
  onQueue: () => void;
  onCancel: () => void;
}

export function RankedMatchmake({
  disabled,
  loading,
  queued,
  status,
  onQueue,
  onCancel,
}: RankedMatchmakeProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      transition={{ delay: 0.15 }}
      className="ranked-matchmake"
    >
      {queued ? (
        <div className="ranked-queued">
          <div className="flex items-center justify-center gap-2 text-sm text-primary">
            <Loader2 className="size-4 animate-spin" />
            {t("ranked.searching")}
          </div>
          {status?.searchRadius != null && (
            <p className="ranked-queued-hint">
              {t("ranked.matching", { radius: status.searchRadius })}
              {status.waitMs != null && status.waitMs > 0
                ? ` · ${t("ranked.waitSeconds", { seconds: Math.floor(status.waitMs / 1000) })}`
                : ""}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full max-w-xs mx-auto mt-2"
            onClick={onCancel}
          >
            {t("ranked.cancel")}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={disabled || loading}
          onClick={onQueue}
          className="w-full max-w-xs mx-auto border-primary/40 text-primary hover:bg-primary/10 h-auto py-2.5"
        >
          <Swords className="size-4 mr-2" />
          {t("ranked.find")}
        </Button>
      )}
      <p className="ranked-matchmake-hint">{t("ranked.hint")}</p>
    </motion.div>
  );
}
