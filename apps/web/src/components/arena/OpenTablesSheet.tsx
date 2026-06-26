import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Users, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  GameModeId,
  LobbyMatch,
  PlayerProfile,
  TournamentQueueStatus,
} from "@sol-tictactoe/shared";
import { cn } from "@/lib/utils";
import { XTT_MODE_ACCENT } from "../../ttt2d/xttColors";
import { OpenTablesPanel } from "./OpenTablesList";

interface OpenTablesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lobbies: LobbyMatch[];
  activeMode: GameModeId;
  betSol: number;
  tableCount: number;
  playerId?: string;
  isGuest?: boolean;
  myRating?: number;
  myGamesPlayed?: number;
  hostProfiles?: Record<string, PlayerProfile>;
  loading?: boolean;
  tournamentQueue?: TournamentQueueStatus | null;
  onJoin: (lobby: LobbyMatch) => void;
}

export function OpenTablesSheet({
  open,
  onOpenChange,
  lobbies,
  activeMode,
  betSol,
  tableCount,
  playerId,
  isGuest = false,
  myRating,
  myGamesPlayed = 0,
  hostProfiles = {},
  loading,
  tournamentQueue,
  onJoin,
}: OpenTablesSheetProps) {
  const { t } = useTranslation();
  const accent = XTT_MODE_ACCENT[activeMode] ?? XTT_MODE_ACCENT.casual1v1;

  if (!open || typeof document === "undefined") return null;

  const handleJoin = (lobby: LobbyMatch) => {
    onJoin(lobby);
  };

  const overlayRoot =
    document.getElementById("app-layer-overlays") ?? document.body;

  return createPortal(
    <>
      <button
        type="button"
        className="open-tables-sheet-backdrop"
        aria-label={t("wallet.close")}
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn("open-tables-sheet", `open-tables-sheet--${activeMode}`)}
        style={{ "--open-tables-accent": accent } as CSSProperties}
        aria-label={t("openTables.title")}
      >
        <div className="open-tables-sheet-glow" aria-hidden />

        <header className="open-tables-sheet-head">
          <div className="open-tables-sheet-head-main">
            <Users className="open-tables-sheet-icon size-4" aria-hidden />
            <div className="open-tables-sheet-titles">
              <h2 className="open-tables-sheet-title">{t("openTables.title")}</h2>
              <p className="open-tables-sheet-mode">{t(`modes.${activeMode}.name`)}</p>
            </div>
            <span className="open-tables-sheet-count">{tableCount}</span>
          </div>
          <button
            type="button"
            className="open-tables-sheet-close"
            onClick={() => onOpenChange(false)}
            aria-label={t("wallet.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <OpenTablesPanel
          lobbies={lobbies}
          contextMode={activeMode}
          contextBetSol={betSol}
          playerId={playerId}
          isGuest={isGuest}
          myRating={myRating}
          myGamesPlayed={myGamesPlayed}
          hostProfiles={hostProfiles}
          loading={loading}
          tournamentQueue={tournamentQueue}
          layout="sheet"
          onJoin={handleJoin}
        />
      </aside>
    </>,
    overlayRoot,
  );
}
