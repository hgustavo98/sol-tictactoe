import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Loader2, Trophy } from "lucide-react";
import type { TournamentFinishedPayload, TournamentState } from "@sol-tictactoe/shared";
import { fadeUp } from "@/components/motion/ViewTransition";
import { Button } from "@/components/ui/button";
import {
  waitingRoomOverlay,
  waitingRoomShell,
  waitingRoomSubtitle,
  waitingRoomTitle,
} from "@/damas3d/lobby/lobbyClasses";
import {
  isTournamentChampion,
  isTournamentEliminated,
  isWaitingForNextRound,
} from "../../utils/tournamentPlayer";
import { TournamentBracketPanel } from "./TournamentBracketPanel";
import type { PlayerProfile } from "@sol-tictactoe/shared";

interface TournamentWaitingRoomProps {
  tournament: TournamentState;
  wallet?: string;
  profiles?: Record<string, PlayerProfile>;
  postGame?: "won" | "lost" | null;
  finished?: TournamentFinishedPayload | null;
  onExit?: () => void;
}

export function TournamentWaitingRoom({
  tournament,
  wallet,
  profiles = {},
  postGame,
  finished,
  onExit,
}: TournamentWaitingRoomProps) {
  const { t } = useTranslation();

  const status = useMemo(() => {
    if (!wallet) return "waiting";
    if (finished || isTournamentChampion(tournament, wallet)) return "champion";
    if (isTournamentEliminated(tournament, wallet) || postGame === "lost") {
      return "eliminated";
    }
    if (isWaitingForNextRound(tournament, wallet) || postGame === "won") {
      return "waiting-next";
    }
    return "waiting";
  }, [wallet, tournament, postGame, finished]);

  const title =
    status === "champion"
      ? t("tournament.waitRoom.championTitle")
      : status === "eliminated"
        ? t("tournament.waitRoom.eliminatedTitle")
        : t("tournament.waitRoom.waitingTitle");

  const subtitle =
    status === "champion"
      ? t("tournament.waitRoom.championSubtitle")
      : status === "eliminated"
        ? t("tournament.waitRoom.eliminatedSubtitle")
        : t("tournament.waitRoom.waitingSubtitle");

  return (
    <div className={waitingRoomOverlay}>
      <motion.div
        className={`${waitingRoomShell} tournament-wait-room`}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div className="tournament-wait-room-icon" aria-hidden>
          {status === "waiting-next" ? (
            <Loader2 className="size-8 animate-spin text-primary" />
          ) : (
            <Trophy className="size-8 text-gold" />
          )}
        </div>

        <h2 className={waitingRoomTitle}>{title}</h2>
        <p className={waitingRoomSubtitle}>{subtitle}</p>

        <TournamentBracketPanel
          tournament={tournament}
          wallet={wallet}
          profiles={profiles}
          compact
        />

        {(status === "eliminated" || status === "champion") && onExit && (
          <Button
            type="button"
            variant="outline"
            className="tournament-wait-room-exit"
            onClick={onExit}
          >
            {t("tournament.waitRoom.backToLobby")}
          </Button>
        )}
      </motion.div>
    </div>
  );
}
