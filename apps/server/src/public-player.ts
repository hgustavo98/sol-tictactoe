import type { PlayerProfile } from "@sol-tictactoe/shared";

/** Strip MongoDB internals before sending player data to browsers. */
export function toPublicPlayerProfile(raw: PlayerProfile): PlayerProfile {
  return {
    wallet: raw.wallet,
    rating: raw.rating,
    gamesPlayed: raw.gamesPlayed,
    wins: raw.wins,
    losses: raw.losses,
    draws: raw.draws,
    updatedAt: raw.updatedAt,
    nickname: raw.nickname ?? null,
    avatarUrl: raw.avatarUrl ?? null,
  };
}

export function toPublicPlayerProfiles(profiles: PlayerProfile[]): PlayerProfile[] {
  return profiles.map(toPublicPlayerProfile);
}
