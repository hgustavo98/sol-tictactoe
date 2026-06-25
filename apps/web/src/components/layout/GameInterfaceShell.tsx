import { useState, type ReactNode } from "react";
import type { GameState } from "@sol-tictactoe/shared";
import type { LobbyView } from "../../ttt2d/lobby/lobbyView";
import { MatchRulesModal } from "../match/MatchRulesModal";
import { GameActionRail } from "./GameActionRail";
import { LobbyCornerActions } from "./LobbyCornerActions";
import { ProfileCompactChip, type ProfileCompactChipProps } from "./ProfileCompactChip";

interface GameInterfaceShellProps {
  lobbyView: LobbyView;
  children: ReactNode;
  onTrainingStart?: () => void;
  profile: Omit<ProfileCompactChipProps, "game"> & {
    game?: GameState | null;
  };
}

export function GameInterfaceShell({
  lobbyView,
  children,
  onTrainingStart,
  profile,
}: GameInterfaceShellProps) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const showLeftRail =
    lobbyView === "browse" ||
    lobbyView === "game" ||
    lobbyView === "training";
  const inGameView = lobbyView === "game";
  const showCornerActions = lobbyView === "browse";

  return (
    <div
      className="game-interface-shell"
      data-lobby-view={lobbyView}
    >
      {showLeftRail && (
        <aside className="game-left-rail">
          <ProfileCompactChip
            {...profile}
            inLeftRail
            splitActionsRail={inGameView}
          />
        </aside>
      )}

      {inGameView && (
        <GameActionRail
          game={profile.game}
          playerId={profile.playerId}
          onOpenRules={() => setRulesOpen(true)}
          onResign={profile.onResign}
        />
      )}

      {showCornerActions && (
        <LobbyCornerActions
          showTraining
          onTrainingStart={onTrainingStart}
          onOpenRules={() => setRulesOpen(true)}
        />
      )}

      <div className="game-interface-content">{children}</div>

      <MatchRulesModal open={rulesOpen} onOpenChange={setRulesOpen} />
    </div>
  );
}
