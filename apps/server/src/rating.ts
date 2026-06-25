import {
  clampRating,
  computeRatingDelta,
  DEFAULT_RATING,
  isServerOpponentWallet,
  scaleRatingDelta,
  type PlayerProfile,
  type RatingDelta,
} from "@sol-tictactoe/shared";
import {
  getOrCreatePlayer,
  updatePlayerStats,
  updatePlayerRating,
} from "./db";

export async function applyGameRatings(input: {
  playerWhite: string;
  playerBlack: string;
  winner?: string;
  isDraw: boolean;
  multiplier?: number;
}): Promise<RatingDelta[]> {
  const white = await getOrCreatePlayer(input.playerWhite);
  const black = await getOrCreatePlayer(input.playerBlack);
  const multiplier = input.multiplier ?? 1;

  let whiteScore: 0 | 0.5 | 1;
  let blackScore: 0 | 0.5 | 1;

  if (input.isDraw || !input.winner) {
    whiteScore = 0.5;
    blackScore = 0.5;
  } else if (input.winner === input.playerWhite) {
    whiteScore = 1;
    blackScore = 0;
  } else {
    whiteScore = 0;
    blackScore = 1;
  }

  let whiteDelta = computeRatingDelta(
    white.rating,
    black.rating,
    whiteScore,
    white.gamesPlayed,
  );
  let blackDelta = computeRatingDelta(
    black.rating,
    white.rating,
    blackScore,
    black.gamesPlayed,
  );

  whiteDelta = scaleRatingDelta(whiteDelta, multiplier);
  blackDelta = scaleRatingDelta(blackDelta, multiplier);

  const whiteAfter = clampRating(white.rating + whiteDelta);
  const blackAfter = clampRating(black.rating + blackDelta);

  if (!isServerOpponentWallet(input.playerWhite)) {
    await updatePlayerStats(input.playerWhite, {
      rating: whiteAfter,
      won: whiteScore === 1,
      lost: whiteScore === 0,
      drew: whiteScore === 0.5,
    });
  }
  if (!isServerOpponentWallet(input.playerBlack)) {
    await updatePlayerStats(input.playerBlack, {
      rating: blackAfter,
      won: blackScore === 1,
      lost: blackScore === 0,
      drew: blackScore === 0.5,
    });
  }

  const changes: RatingDelta[] = [];
  if (!isServerOpponentWallet(input.playerWhite)) {
    changes.push({
      wallet: input.playerWhite,
      ratingBefore: white.rating,
      ratingAfter: whiteAfter,
      delta: whiteAfter - white.rating,
    });
  }
  if (!isServerOpponentWallet(input.playerBlack)) {
    changes.push({
      wallet: input.playerBlack,
      ratingBefore: black.rating,
      ratingAfter: blackAfter,
      delta: blackAfter - black.rating,
    });
  }

  return changes;
}

export async function getPlayerRating(wallet: string): Promise<number> {
  return (await getOrCreatePlayer(wallet)).rating;
}

/** Placement bonuses at end of a tournament (on top of per-match ELO). */
export async function applyTournamentBonuses(
  players: string[],
  winner: string,
): Promise<{ wallet: string; delta: number }[]> {
  const bonuses: { wallet: string; delta: number }[] = [];
  const championBonus = 20;
  const participantBonus = 5;

  for (const wallet of players) {
    const player = await getOrCreatePlayer(wallet);
    const bonus = wallet === winner ? championBonus : participantBonus;
    const after = clampRating(player.rating + bonus);
    await updatePlayerRating(wallet, after);
    bonuses.push({ wallet, delta: after - player.rating });
  }

  return bonuses;
}

export function freshProfile(wallet: string): PlayerProfile {
  return {
    wallet,
    rating: DEFAULT_RATING,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    updatedAt: Date.now(),
  };
}
