import { botInMatch, isServerOpponentWallet } from "@sol-tictactoe/shared";
import { config } from "./config";
import { matchManager } from "./match-manager";
import { getLivePresenceSnapshot } from "./presence";

export interface BotLoadSnapshot {
  connectedSockets: number;
  activeBotMatches: number;
  activeHumanMatches: number;
  humanWaitingLobbies: number;
}

export interface BotCapacityResult extends BotLoadSnapshot {
  loadScore: number;
  maxTables: number;
  ceiling: number;
  floor: number;
}

function countMatchLoad(): Pick<
  BotLoadSnapshot,
  "activeBotMatches" | "activeHumanMatches"
> {
  let activeBotMatches = 0;
  let activeHumanMatches = 0;

  for (const matchId of matchManager.activeMatchIds()) {
    const state = matchManager.getGame(matchId);
    if (!state || state.status !== "playing") continue;
    if (botInMatch(state.playerWhite, state.playerBlack)) {
      activeBotMatches += 1;
    } else {
      activeHumanMatches += 1;
    }
  }

  return { activeBotMatches, activeHumanMatches };
}

export function gatherBotLoadSnapshot(): BotLoadSnapshot {
  const presence = getLivePresenceSnapshot();
  const matchLoad = countMatchLoad();
  const humanWaitingLobbies = matchManager
    .listLobbies()
    .filter(
      (lobby) =>
        lobby.status === "waiting" &&
        !lobby.player2 &&
        !isServerOpponentWallet(lobby.player1),
    ).length;

  return {
    connectedSockets: presence.total,
    ...matchLoad,
    humanWaitingLobbies,
  };
}

/**
 * Derives how many casual ghost tables the server may host.
 * More connected players and active bot games → fewer bot tables (frees CPU/RAM).
 */
export function computeBotCapacity(
  load: BotLoadSnapshot,
  options: {
    ceiling: number;
    floor: number;
    usersBeforeReduce: number;
    usersPerTableReduction: number;
    softSocketCap: number;
    botMatchWeight: number;
    humanMatchWeight: number;
    waitingLobbyWeight: number;
  },
): BotCapacityResult {
  const {
    ceiling,
    floor,
    usersBeforeReduce,
    usersPerTableReduction,
    softSocketCap,
    botMatchWeight,
    humanMatchWeight,
    waitingLobbyWeight,
  } = options;

  const loadScore = Math.round(
    load.connectedSockets +
      load.activeBotMatches * botMatchWeight +
      load.activeHumanMatches * humanMatchWeight +
      load.humanWaitingLobbies * waitingLobbyWeight,
  );

  if (load.connectedSockets >= softSocketCap) {
    return {
      ...load,
      loadScore,
      maxTables: 0,
      ceiling,
      floor,
    };
  }

  if (loadScore <= usersBeforeReduce) {
    return {
      ...load,
      loadScore,
      maxTables: ceiling,
      ceiling,
      floor,
    };
  }

  const excess = loadScore - usersBeforeReduce;
  const reduction = Math.ceil(excess / Math.max(1, usersPerTableReduction));
  const maxTables = Math.max(floor, ceiling - reduction);

  return {
    ...load,
    loadScore,
    maxTables: Math.min(ceiling, maxTables),
    ceiling,
    floor,
  };
}

export function getBotCapacity(): BotCapacityResult {
  const ceiling = config.botCasualMaxTables;
  const floor = Math.min(config.botCasualMinTables, ceiling);
  return computeBotCapacity(gatherBotLoadSnapshot(), {
    ceiling,
    floor,
    usersBeforeReduce: config.botLoadUsersBeforeReduce,
    usersPerTableReduction: config.botLoadUsersPerTable,
    softSocketCap: config.botLoadSoftSocketCap,
    botMatchWeight: config.botLoadBotMatchWeight,
    humanMatchWeight: config.botLoadHumanMatchWeight,
    waitingLobbyWeight: config.botLoadWaitingLobbyWeight,
  });
}
