import {
  isCasualMode,
  isCustomMode,
  lobbiesCompatibleForJoin,
  solToLamports,
  type GameModeId,
  type LobbyMatch,
} from "@sol-tictactoe/shared";
import { betSolForMode } from "../config/gameModes";

export function filterLobbiesByContext(
  lobbies: LobbyMatch[],
  activeMode: GameModeId,
  betSol: number,
): LobbyMatch[] {
  const entrySol = betSolForMode(activeMode, betSol);
  const betLamports = solToLamports(entrySol);

  return lobbies.filter((lobby) => {
    if (isCasualMode(activeMode)) {
      return (
        !lobby.tournamentId &&
        lobby.betLamports === 0 &&
        lobbiesCompatibleForJoin(lobby, { gameMode: activeMode, betLamports: 0 })
      );
    }

    if (isCustomMode(activeMode)) {
      return lobbiesCompatibleForJoin(lobby, {
        gameMode: activeMode,
        betLamports,
      });
    }

    return false;
  });
}
