import * as Dialog from "@radix-ui/react-dialog";
import { Users, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  GameModeId,
  LobbyMatch,
  PlayerProfile,
  TournamentQueueStatus,
} from "@sol-tictactoe/shared";
import { cn } from "@/lib/utils";
import { OpenTablesPanel } from "./OpenTablesList";

interface OpenTablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lobbies: LobbyMatch[];
  activeMode: GameModeId;
  betSol: number;
  playerId?: string;
  isGuest?: boolean;
  myRating?: number;
  myGamesPlayed?: number;
  hostProfiles?: Record<string, PlayerProfile>;
  loading?: boolean;
  tournamentQueue?: TournamentQueueStatus | null;
  onJoin: (lobby: LobbyMatch) => void;
}

/** Modal de mesas abertas renderizado dentro do painel do lobby (sem portal no body). */
export function OpenTablesModal({
  open,
  onOpenChange,
  lobbies,
  activeMode,
  betSol,
  playerId,
  isGuest = false,
  myRating,
  myGamesPlayed = 0,
  hostProfiles = {},
  loading,
  tournamentQueue,
  onJoin,
}: OpenTablesModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const handleJoin = (lobby: LobbyMatch) => {
    onJoin(lobby);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Overlay
        className={cn(
          "open-tables-modal-overlay",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        )}
      />
      <Dialog.Content
        className={cn(
          "open-tables-modal-content",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="open-tables-modal-head">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" aria-hidden />
            <Dialog.Title className="open-tables-modal-title">
              {t("openTables.title")}
            </Dialog.Title>
          </div>
          <Dialog.Close asChild>
            <button
              type="button"
              className="open-tables-modal-close"
              aria-label={t("wallet.close")}
            >
              <X className="size-4" />
            </button>
          </Dialog.Close>
        </div>

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
          layout="modal"
          onJoin={handleJoin}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
