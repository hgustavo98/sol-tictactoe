import { useMemo } from "react";
import {
  DEFAULT_MODE_AVAILABILITY,
  isModePlayable,
  type GameModeId,
  type ModeAvailabilityMap,
  type ModeAvailabilityStatus,
} from "@sol-tictactoe/shared";
import { useAppConfig } from "./useWalletData";

export function useModeAvailability() {
  const { config } = useAppConfig();

  const availability = useMemo<ModeAvailabilityMap>(
    () => config?.gameModeAvailability ?? DEFAULT_MODE_AVAILABILITY,
    [config?.gameModeAvailability],
  );

  const statusFor = (mode: GameModeId): ModeAvailabilityStatus =>
    availability[mode] ?? "open";

  const isPlayable = (mode: GameModeId): boolean =>
    isModePlayable(statusFor(mode));

  return { availability, statusFor, isPlayable };
}
