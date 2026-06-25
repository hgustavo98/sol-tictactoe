import {
  GAME_MODES,
  type GameModeId,
} from "./economics";

/** Admin-controlled lobby availability per game mode. */
export type ModeAvailabilityStatus = "open" | "coming_soon" | "closed";

export type ModeAvailabilityMap = Record<GameModeId, ModeAvailabilityStatus>;

export const MODE_AVAILABILITY_STATUSES: ModeAvailabilityStatus[] = [
  "open",
  "coming_soon",
  "closed",
];

export const MODE_AVAILABILITY_SORT_ORDER: Record<ModeAvailabilityStatus, number> = {
  open: 0,
  coming_soon: 1,
  closed: 2,
};

export function sortGameModesByAvailability(
  modes: readonly GameModeId[],
  map: ModeAvailabilityMap,
): GameModeId[] {
  return [...modes].sort((a, b) => {
    const orderA = MODE_AVAILABILITY_SORT_ORDER[map[a] ?? "open"];
    const orderB = MODE_AVAILABILITY_SORT_ORDER[map[b] ?? "open"];
    if (orderA !== orderB) return orderA - orderB;
    return modes.indexOf(a) - modes.indexOf(b);
  });
}

export function firstPlayableGameMode(
  modes: readonly GameModeId[],
  map: ModeAvailabilityMap,
): GameModeId | undefined {
  return sortGameModesByAvailability(modes, map).find(
    (mode) => isModePlayable(map[mode] ?? "open"),
  );
}

export const DEFAULT_MODE_AVAILABILITY: ModeAvailabilityMap = Object.fromEntries(
  GAME_MODES.map((mode) => [mode, "open"]),
) as ModeAvailabilityMap;

export class ModeUnavailableError extends Error {
  constructor(
    public readonly mode: GameModeId,
    public readonly status: ModeAvailabilityStatus,
  ) {
    super(
      status === "coming_soon"
        ? "This game mode is coming soon"
        : "This game mode is currently closed",
    );
    this.name = "ModeUnavailableError";
  }
}

export function isModePlayable(status: ModeAvailabilityStatus | undefined): boolean {
  return (status ?? "open") === "open";
}

export function parseModeAvailability(raw: string | null | undefined): ModeAvailabilityMap {
  if (!raw?.trim()) return { ...DEFAULT_MODE_AVAILABILITY };
  try {
    const parsed = JSON.parse(raw) as Partial<Record<string, string>>;
    const out = { ...DEFAULT_MODE_AVAILABILITY };
    for (const mode of GAME_MODES) {
      const value = parsed[mode];
      if (value === "open" || value === "coming_soon" || value === "closed") {
        out[mode] = value;
      }
    }
    return out;
  } catch {
    return { ...DEFAULT_MODE_AVAILABILITY };
  }
}

export function normalizeModeAvailabilityInput(
  input: Partial<Record<string, string>> | undefined,
): Partial<ModeAvailabilityMap> {
  if (!input) return {};
  const out: Partial<ModeAvailabilityMap> = {};
  for (const mode of GAME_MODES) {
    const value = input[mode];
    if (value === "open" || value === "coming_soon" || value === "closed") {
      out[mode] = value;
    }
  }
  return out;
}

export function mergeModeAvailability(
  current: ModeAvailabilityMap,
  patch: Partial<ModeAvailabilityMap>,
): ModeAvailabilityMap {
  return { ...current, ...patch };
}

export function assertModeAvailable(
  mode: GameModeId,
  map: ModeAvailabilityMap,
): void {
  const status = map[mode] ?? "open";
  if (!isModePlayable(status)) {
    throw new ModeUnavailableError(mode, status);
  }
}

export function resolveLobbyGameMode(lobby: {
  gameMode?: string;
  ranked?: boolean;
  betLamports: number;
  tournamentId?: string;
}): GameModeId {
  if (lobby.gameMode === "custom1v1" || lobby.gameMode === "casual1v1") {
    return lobby.gameMode;
  }
  return lobby.betLamports === 0 ? "casual1v1" : "custom1v1";
}

export function resolveRankedModeFromBet(_betLamports: number): GameModeId {
  return "custom1v1";
}

export function modeForTournamentSize(_size: import("./tournament").TournamentSize): GameModeId {
  return "casual1v1";
}

export function modeLabelKey(mode: GameModeId): string {
  return `modes.${mode}.name`;
}
