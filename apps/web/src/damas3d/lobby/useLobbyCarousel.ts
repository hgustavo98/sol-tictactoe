import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LobbyMatch, TournamentQueueStatus } from "@sol-tictactoe/shared";
import {
  countRankedOpenLobbies,
  firstPlayableGameMode,
  isModePlayable,
  sortGameModesByAvailability,
} from "@sol-tictactoe/shared";
import {
  arenaPrizeSol,
  clampBetSol,
  clampRankedBetSol,
  CUSTOM_MIN_BET_SOL,
  formatSolAmount,
  lobbiesForBet,
  validateBetSol,
  validateRankedBetSol,
  type BetErrorKey,
} from "../../config/bets";
import {
  betSolForMode,
  GAME_MODES,
  isCasualMode,
  isCustomMode,
  isRankedMode,
  isRankedPresetsMode,
  isRankedStakeMode,
  isTournamentMode,
  isFeaturedTournamentMode,
  modeCountsForRating,
  prizeSolForMode,
  rakeBpsForMode,
  RANKED_BET_SOL,
  RANKED_MIN_BET_SOL,
  rankedStakeMultiplier,
  solToLamports,
  tournamentRatingMultiplier,
  tournamentSizeFromMode,
  tournamentQueueForSize,
  pickFeaturedTournamentQueue,
  type GameModeId,
} from "../../config/gameModes";
import { MODE_ACCENT } from "./dopamineColors";
import type { ArenaCardData } from "./ArenaCard3D";
import { useModeAvailability } from "../../hooks/useModeAvailability";

interface UseLobbyCarouselOptions {
  lobbies: LobbyMatch[];
  betSol: number;
  onSelectBet: (bet: number) => void;
  onModeChange: (mode: GameModeId) => void;
  tournamentQueue?: TournamentQueueStatus | null;
  allTournamentQueues?: TournamentQueueStatus[];
  isGuest?: boolean;
  myProfile?: { rating: number; gamesPlayed: number } | null;
}

export function useLobbyCarousel({
  lobbies,
  betSol,
  onSelectBet,
  onModeChange,
  tournamentQueue,
  allTournamentQueues = [],
  isGuest = false,
  myProfile = null,
}: UseLobbyCarouselOptions) {
  const { t } = useTranslation();
  const { availability, statusFor } = useModeAvailability();
  const slides = useMemo(
    () => sortGameModesByAvailability(GAME_MODES, availability),
    [availability],
  );
  const defaultMode =
    firstPlayableGameMode(GAME_MODES, availability) ?? slides[0] ?? "casual1v1";
  const initialIndex = Math.max(0, slides.indexOf(defaultMode));
  const [index, setIndex] = useState(initialIndex);
  const activeModeRef = useRef<GameModeId>(slides[initialIndex] ?? defaultMode);
  const prevAvailabilityRef = useRef(availability);
  const [customInput, setCustomInput] = useState(
    formatSolAmount(CUSTOM_MIN_BET_SOL),
  );
  const [customError, setCustomError] = useState<BetErrorKey | null>(null);
  const [rankedStakeInput, setRankedStakeInput] = useState(
    formatSolAmount(RANKED_MIN_BET_SOL),
  );
  const [rankedStakeError, setRankedStakeError] = useState<BetErrorKey | null>(
    null,
  );

  const featuredQueue = useMemo(
    () => pickFeaturedTournamentQueue(allTournamentQueues),
    [allTournamentQueues],
  );

  const applySlide = useCallback(
    (mode: GameModeId) => {
      onModeChange(mode);
      if (isCustomMode(mode)) {
        onSelectBet(CUSTOM_MIN_BET_SOL);
        setCustomInput(formatSolAmount(CUSTOM_MIN_BET_SOL));
        setCustomError(null);
      } else if (isRankedPresetsMode(mode)) {
        onSelectBet(RANKED_BET_SOL);
        setCustomError(null);
        setRankedStakeError(null);
      } else if (isRankedStakeMode(mode)) {
        onSelectBet(RANKED_MIN_BET_SOL);
        setRankedStakeInput(formatSolAmount(RANKED_MIN_BET_SOL));
        setRankedStakeError(null);
      } else if (isRankedMode(mode)) {
        onSelectBet(RANKED_BET_SOL);
      } else {
        onSelectBet(betSolForMode(mode));
      }
    },
    [onModeChange, onSelectBet],
  );

  useEffect(() => {
    applySlide(slides[initialIndex] ?? defaultMode);
    // Sync lobby to default slide on first mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mode = activeModeRef.current;
    const nextIndex = slides.indexOf(mode);
    const previousAvailability = prevAvailabilityRef.current;
    const previousStatus = previousAvailability[mode] ?? "open";
    const currentStatus = statusFor(mode);
    const modeJustClosed =
      previousAvailability !== availability &&
      isModePlayable(previousStatus) &&
      !isModePlayable(currentStatus);

    prevAvailabilityRef.current = availability;

    if (nextIndex < 0) {
      const fallback = firstPlayableGameMode(GAME_MODES, availability) ?? slides[0];
      if (!fallback) return;
      const fallbackIndex = slides.indexOf(fallback);
      setIndex(fallbackIndex >= 0 ? fallbackIndex : 0);
      applySlide(fallback);
      return;
    }

    setIndex(nextIndex);

    if (modeJustClosed) {
      const fallback = firstPlayableGameMode(GAME_MODES, availability);
      if (fallback && fallback !== mode) {
        const fallbackIndex = slides.indexOf(fallback);
        if (fallbackIndex >= 0) {
          setIndex(fallbackIndex);
          applySlide(fallback);
        }
      }
    }
  }, [slides, availability, applySlide, statusFor]);

  const selectIndex = useCallback(
    (next: number) => {
      const wrapped = ((next % slides.length) + slides.length) % slides.length;
      setIndex(wrapped);
      applySlide(slides[wrapped]);
    },
    [slides, applySlide],
  );

  const applyCustom = useCallback(
    (raw: string) => {
      setCustomInput(raw);
      const parsed = parseFloat(raw.replace(",", "."));
      const err = validateBetSol(parsed);
      setCustomError(err);
      if (!err) {
        onSelectBet(clampBetSol(parsed));
      }
    },
    [onSelectBet],
  );

  const applyRankedStake = useCallback(
    (raw: string) => {
      setRankedStakeInput(raw);
      const parsed = parseFloat(raw.replace(",", "."));
      const err = validateRankedBetSol(parsed);
      setRankedStakeError(err);
      if (!err) {
        onSelectBet(clampRankedBetSol(parsed));
      }
    },
    [onSelectBet],
  );

  const activeMode = slides[index] ?? defaultMode;
  activeModeRef.current = activeMode;

  const cardDataList: ArenaCardData[] = useMemo(
    () =>
      slides.map((mode, i) => {
        const activeBet = isCustomMode(mode)
          ? betSol
          : isRankedPresetsMode(mode)
            ? RANKED_BET_SOL
            : isRankedStakeMode(mode)
              ? betSol
              : isRankedMode(mode)
                ? RANKED_BET_SOL
                : betSolForMode(mode);
        const isFreeCasual = isCasualMode(mode) && activeBet === 0;
        const prize = isFreeCasual
          ? "—"
          : formatSolAmount(
              isCustomMode(mode) || isRankedPresetsMode(mode) || isRankedStakeMode(mode)
                ? arenaPrizeSol(activeBet, rakeBpsForMode(mode))
                : prizeSolForMode(mode, betSol),
            );
        const entry = isFreeCasual ? "—" : formatSolAmount(activeBet);
        const tSize = tournamentSizeFromMode(mode);
        const adminStatus = statusFor(mode);
        const modeStatus =
          adminStatus === "coming_soon" || adminStatus === "closed"
            ? adminStatus
            : null;
        const locked =
          adminStatus !== "open" || (isGuest && !isCasualMode(mode));
        const countsForRating = modeCountsForRating(mode);
        const ratingMultiplier = isRankedMode(mode)
          ? rankedStakeMultiplier(solToLamports(activeBet))
          : tSize
            ? tournamentRatingMultiplier(tSize)
            : 1;
        const eloContext =
          countsForRating && myProfile
            ? {
                myRating: myProfile.rating,
                myGamesPlayed: myProfile.gamesPlayed,
                ratingMultiplier,
                isTournament: isTournamentMode(mode),
              }
            : undefined;

        if (isCustomMode(mode)) {
          return {
            id: mode,
            badge: t("arena.badgeCustom"),
            title: t("modes.custom1v1.name"),
            subtitle: t("modes.custom1v1.subtitle"),
            prize,
            waiting: lobbiesForBet(lobbies, betSol),
            entry,
            accentColor: MODE_ACCENT[mode],
            accentIndex: i,
            isCustom: true,
            locked,
            modeStatus,
            countsForRating,
            ...eloContext,
            customInput,
            customError,
            onCustomInput: applyCustom,
          };
        }

        if (isRankedPresetsMode(mode)) {
          const targetLamports = solToLamports(RANKED_BET_SOL);
          return {
            id: mode,
            badge: t("arena.badgeRanked"),
            title: t("modes.rankedPresets1v1.name"),
            subtitle: t("modes.rankedPresets1v1.subtitle"),
            prize,
            waiting: countRankedOpenLobbies(lobbies, targetLamports),
            entry,
            accentColor: MODE_ACCENT[mode],
            accentIndex: i,
            isRanked: true,
            rankedTagline: t("arena.rankedMatchmakingTagline"),
            locked,
            modeStatus,
            countsForRating,
            ...eloContext,
          };
        }

        if (isRankedStakeMode(mode)) {
          const targetLamports = solToLamports(betSol);
          return {
            id: mode,
            badge: t("arena.badgeRanked"),
            title: t("modes.rankedStake1v1.name"),
            subtitle: t("modes.rankedStake1v1.subtitle"),
            prize,
            waiting: countRankedOpenLobbies(lobbies, targetLamports),
            entry,
            accentColor: MODE_ACCENT[mode],
            accentIndex: i,
            isRanked: true,
            isRankedStake: true,
            stakeInput: rankedStakeInput,
            stakeError: rankedStakeError,
            onStakeInput: applyRankedStake,
            rankedTagline: t("arena.rankedMatchmakingTagline"),
            locked,
            modeStatus,
            countsForRating,
            ...eloContext,
          };
        }

        if (isTournamentMode(mode) && tSize) {
          const queueForSlide =
            tournamentQueueForSize(allTournamentQueues, tSize) ??
            (tournamentQueue?.size === tSize ? tournamentQueue : null);
          const registered = queueForSlide?.registered ?? 0;
          const featured =
            featuredQueue?.size === tSize ||
            (!featuredQueue && isFeaturedTournamentMode(mode));
          return {
            id: mode,
            badge: featured
              ? t("arena.badgeMegaCup")
              : t("arena.badgeTournament"),
            title: t(`modes.${mode}.name`),
            subtitle: t(`modes.${mode}.subtitle`),
            prize,
            waiting: registered,
            entry,
            accentColor: MODE_ACCENT[mode],
            accentIndex: i,
            isTournament: true,
            isFeatured: featured,
            tournamentSize: tSize,
            tournamentTagline: featured
              ? t("arena.featuredTournamentTagline", {
                  current: registered,
                  total: tSize,
                })
              : t("arena.tournamentTagline", {
                  current: registered,
                  total: tSize,
                }),
            locked,
            modeStatus,
            countsForRating,
            ...eloContext,
          };
        }

        return {
          id: mode,
          badge: t("arena.badge1v1"),
          title: t(`modes.${mode}.name`),
          subtitle: t(`modes.${mode}.subtitle`),
          prize,
          waiting: lobbiesForBet(lobbies, activeBet),
          entry,
          accentColor: MODE_ACCENT[mode],
          accentIndex: i,
          isFreeCasual,
          locked,
          modeStatus,
          countsForRating,
          ...eloContext,
        };
      }),
    [
      slides,
      lobbies,
      betSol,
      t,
      tournamentQueue,
      allTournamentQueues,
      featuredQueue,
      customInput,
      customError,
      applyCustom,
      rankedStakeInput,
      rankedStakeError,
      applyRankedStake,
      isGuest,
      myProfile,
      statusFor,
    ],
  );

  const goPrev = useCallback(() => {
    setIndex((current) => {
      const wrapped = (current - 1 + slides.length) % slides.length;
      applySlide(slides[wrapped]);
      return wrapped;
    });
  }, [slides, applySlide]);

  const goNext = useCallback(() => {
    setIndex((current) => {
      const wrapped = (current + 1) % slides.length;
      applySlide(slides[wrapped]);
      return wrapped;
    });
  }, [slides, applySlide]);

  return {
    index,
    slideCount: slides.length,
    cardDataList,
    selectIndex,
    goPrev,
    goNext,
    activeMode,
    isRankedSlide: isRankedMode(activeMode),
    isRankedStakeSlide: isRankedStakeMode(activeMode),
    isTournamentSlide: isTournamentMode(activeMode),
    isCustomSlide: isCustomMode(activeMode),
    rankedStakeInvalid: isRankedStakeMode(activeMode) && !!rankedStakeError,
  };
}

export function wrapCarouselOffset(
  i: number,
  active: number,
  total: number,
): number {
  let diff = i - active;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}
