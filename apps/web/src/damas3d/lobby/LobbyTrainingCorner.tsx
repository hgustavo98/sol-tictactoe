import { Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trainingCorner } from "./lobbyClasses";

interface LobbyTrainingCornerProps {
  onClick: () => void;
}

/** Botão de treino fixo no canto inferior esquerdo do lobby. */
export function LobbyTrainingCorner({ onClick }: LobbyTrainingCornerProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className={trainingCorner}
      aria-label={t("training.start")}
    >
      <Bot className="size-4 shrink-0 text-cyan-400" strokeWidth={2.25} />
      <span className="hidden sm:inline">{t("training.start")}</span>
      <span className="sm:hidden">{t("training.startShort")}</span>
    </button>
  );
}
