export type TournamentSize = 4 | 6 | 8 | 12;

export type TournamentBracketStatus =
  | "bye"
  | "pending"
  | "ready"
  | "playing"
  | "completed";

export interface TournamentBracketMatch {
  id: string;
  round: number;
  roundIndex: number;
  playerA?: string;
  playerB?: string;
  winner?: string;
  gameMatchId?: string;
  status: TournamentBracketStatus;
}

export interface TournamentState {
  id: string;
  size: TournamentSize;
  entryLamports: number;
  status: "registering" | "active" | "finished";
  players: string[];
  bracket: TournamentBracketMatch[];
  winner?: string;
}

export interface TournamentQueueStatus {
  size: TournamentSize;
  entryLamports: number;
  registered: number;
  needed: number;
  wallets: string[];
}

/** Tournament slide with the most sign-ups; ties favor the queue closest to starting. */
export function pickFeaturedTournamentQueue(
  queues: TournamentQueueStatus[],
): TournamentQueueStatus | null {
  if (!queues.length) return null;
  return [...queues].sort((a, b) => {
    if (b.registered !== a.registered) return b.registered - a.registered;
    const slotsLeftA = a.needed - a.registered;
    const slotsLeftB = b.needed - b.registered;
    return slotsLeftA - slotsLeftB;
  })[0];
}

export function tournamentQueueForSize(
  queues: TournamentQueueStatus[],
  size: TournamentSize,
): TournamentQueueStatus | undefined {
  return queues.find((q) => q.size === size);
}

export interface TournamentRegisterPayload {
  wallet: string;
  size: TournamentSize;
  entryLamports: number;
}

export interface TournamentMatchReadyPayload {
  tournamentId: string;
  bracketMatchId: string;
  matchId: string;
  role: "creator" | "joiner";
  opponentWallet: string;
  entryLamports: number;
  round: number;
}

export interface TournamentFinishedPayload {
  tournamentId: string;
  winner: string;
  size: TournamentSize;
  entryLamports: number;
  prizeLamports: number;
  ratingBonuses?: { wallet: string; delta: number }[];
}

export function tournamentPrizeLamports(
  size: number,
  entryLamports: number,
  houseRakeBps: number,
): number {
  const totalPot = entryLamports * size;
  const rakeLamports = Math.floor((totalPot * houseRakeBps) / 10_000);
  return totalPot - rakeLamports;
}

export function tournamentPrizeSol(
  size: number,
  entrySol: number,
  houseRakeBps: number,
): number {
  const entryLamports = Math.round(entrySol * 1_000_000_000);
  return tournamentPrizeLamports(size, entryLamports, houseRakeBps) / 1_000_000_000;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Single-elimination bracket. Size 6 uses 2 byes in round 1. */
export function buildTournamentBracket(
  size: TournamentSize,
  players: string[],
  idGen: () => string,
): TournamentBracketMatch[] {
  if (players.length !== size) {
    throw new Error(`Expected ${size} players, got ${players.length}`);
  }

  const seeded = shuffle(players);
  const matches: TournamentBracketMatch[] = [];

  if (size === 4) {
    matches.push({
      id: idGen(),
      round: 1,
      roundIndex: 0,
      playerA: seeded[0],
      playerB: seeded[1],
      status: "ready",
    });
    matches.push({
      id: idGen(),
      round: 1,
      roundIndex: 1,
      playerA: seeded[2],
      playerB: seeded[3],
      status: "ready",
    });
    matches.push({ id: idGen(), round: 2, roundIndex: 0, status: "pending" });
    return matches;
  }

  if (size === 8) {
    for (let i = 0; i < 4; i++) {
      matches.push({
        id: idGen(),
        round: 1,
        roundIndex: i,
        playerA: seeded[i * 2],
        playerB: seeded[i * 2 + 1],
        status: "ready",
      });
    }
    matches.push({ id: idGen(), round: 2, roundIndex: 0, status: "pending" });
    matches.push({ id: idGen(), round: 2, roundIndex: 1, status: "pending" });
    matches.push({ id: idGen(), round: 3, roundIndex: 0, status: "pending" });
    return matches;
  }

  if (size === 12) {
    for (let i = 0; i < 4; i++) {
      matches.push({
        id: idGen(),
        round: 1,
        roundIndex: i,
        playerA: seeded[i * 2 + 4],
        playerB: seeded[i * 2 + 5],
        status: "ready",
      });
    }
    for (let i = 0; i < 4; i++) {
      matches.push({
        id: idGen(),
        round: 2,
        roundIndex: i,
        playerA: seeded[i],
        status: "pending",
      });
    }
    matches.push({ id: idGen(), round: 3, roundIndex: 0, status: "pending" });
    matches.push({ id: idGen(), round: 3, roundIndex: 1, status: "pending" });
    matches.push({ id: idGen(), round: 4, roundIndex: 0, status: "pending" });
    return matches;
  }

  matches.push({
    id: idGen(),
    round: 1,
    roundIndex: 0,
    playerA: seeded[2],
    playerB: seeded[5],
    status: "ready",
  });
  matches.push({
    id: idGen(),
    round: 1,
    roundIndex: 1,
    playerA: seeded[3],
    playerB: seeded[4],
    status: "ready",
  });
  matches.push({
    id: idGen(),
    round: 2,
    roundIndex: 0,
    playerA: seeded[0],
    status: "pending",
  });
  matches.push({
    id: idGen(),
    round: 2,
    roundIndex: 1,
    playerA: seeded[1],
    status: "pending",
  });
  matches.push({ id: idGen(), round: 3, roundIndex: 0, status: "pending" });
  return matches;
}

export function advanceBracketWinner(
  bracket: TournamentBracketMatch[],
  completedMatchId: string,
  winner: string,
): { nextReady: TournamentBracketMatch[]; champion?: string } {
  const match = bracket.find((m) => m.id === completedMatchId);
  if (!match) throw new Error("Bracket match not found");

  match.winner = winner;
  match.status = "completed";

  const maxRound = Math.max(...bracket.map((m) => m.round));
  if (match.round === maxRound) {
    return { nextReady: [], champion: winner };
  }

  const nextRound = match.round + 1;
  const sameRound = bracket
    .filter((m) => m.round === match.round)
    .sort((a, b) => a.roundIndex - b.roundIndex);
  const posInRound = sameRound.findIndex((m) => m.id === completedMatchId);
  const nextRoundMatches = bracket
    .filter((m) => m.round === nextRound)
    .sort((a, b) => a.roundIndex - b.roundIndex);
  const target = nextRoundMatches[Math.floor(posInRound / 2)];
  if (!target) throw new Error("No next bracket slot");

  if (!target.playerA) target.playerA = winner;
  else if (!target.playerB) target.playerB = winner;
  else throw new Error("Bracket slot full");

  const nextReady: TournamentBracketMatch[] = [];
  if (target.playerA && target.playerB) {
    target.status = "ready";
    nextReady.push(target);
  }

  return { nextReady };
}
