import { Bot, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { lobbyCornerActions, trainingBtn } from "../../damas3d/lobby/lobbyClasses";

interface LobbyCornerActionsProps {
  showTraining?: boolean;
  onTrainingStart?: () => void;
  onOpenRules: () => void;
}

export function LobbyCornerActions({
  showTraining = false,
  onTrainingStart,
  onOpenRules,
}: LobbyCornerActionsProps) {
  const { t } = useTranslation();

  return (
    <div className={lobbyCornerActions}>
      {showTraining && onTrainingStart && (
        <button
          type="button"
          onClick={onTrainingStart}
          className={trainingBtn}
          aria-label={t("training.start")}
        >
          <Bot className="size-4 shrink-0 text-red-400" strokeWidth={2.25} />
          <span className="lobby-corner-btn-label">{t("training.startShort")}</span>
        </button>
      )}
      <button
        type="button"
        onClick={onOpenRules}
        className={trainingBtn}
        aria-label={t("profile.rules.button")}
      >
        <ScrollText className="size-4 shrink-0 text-red-300" strokeWidth={2.25} />
        <span className="lobby-corner-btn-label">{t("profile.rules.buttonShort")}</span>
      </button>
    </div>
  );
}
