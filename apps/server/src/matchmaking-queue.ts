import { randomUUID } from "crypto";
import {
  MATCHMAKE_INITIAL_RADIUS,
  MATCHMAKE_MAX_RADIUS,
  MATCHMAKE_RADIUS_GROWTH_MS,
  MATCHMAKE_RADIUS_STEP,
  type MatchmakeFoundPayload,
  type MatchmakeStatusPayload,
} from "@sol-tictactoe/shared";

interface QueueEntry {
  wallet: string;
  betLamports: number;
  socketId: string;
  queuedAt: number;
  rating: number;
  ranked: boolean;
}

export class MatchmakingQueue {
  private queue = new Map<string, QueueEntry>();

  enqueue(
    wallet: string,
    betLamports: number,
    socketId: string,
    ranked = true,
    rating: number,
  ): MatchmakeStatusPayload {
    this.queue.set(wallet, {
      wallet,
      betLamports,
      socketId,
      queuedAt: Date.now(),
      rating,
      ranked,
    });
    return this.statusFor(wallet);
  }

  cancel(wallet: string): void {
    this.queue.delete(wallet);
  }

  isQueued(wallet: string): boolean {
    return this.queue.has(wallet);
  }

  statusFor(wallet: string): MatchmakeStatusPayload {
    const entry = this.queue.get(wallet);
    if (!entry) return { queued: false };
    return {
      queued: true,
      betLamports: entry.betLamports,
      waitMs: Date.now() - entry.queuedAt,
      rating: entry.rating,
      searchRadius: this.searchRadius(entry),
    };
  }

  private searchRadius(entry: QueueEntry): number {
    const waited = Date.now() - entry.queuedAt;
    const steps = Math.floor(waited / MATCHMAKE_RADIUS_GROWTH_MS);
    return Math.min(
      MATCHMAKE_MAX_RADIUS,
      MATCHMAKE_INITIAL_RADIUS + steps * MATCHMAKE_RADIUS_STEP,
    );
  }

  /** Returns up to one pairing; removes both players from queue. */
  tryPair(): {
    a: QueueEntry;
    b: QueueEntry;
    matchId: string;
    ratingGap: number;
  } | null {
    const entries = Array.from(this.queue.values()).sort(
      (x, y) => x.queuedAt - y.queuedAt,
    );

    for (let i = 0; i < entries.length; i++) {
      const a = entries[i];
      const radiusA = this.searchRadius(a);

      for (let j = i + 1; j < entries.length; j++) {
        const b = entries[j];
        if (a.betLamports !== b.betLamports) continue;
        if (a.ranked !== b.ranked) continue;

        const gap = Math.abs(a.rating - b.rating);
        const radiusB = this.searchRadius(b);
        const allowed = Math.max(radiusA, radiusB);

        if (gap <= allowed) {
          this.queue.delete(a.wallet);
          this.queue.delete(b.wallet);
          return {
            a,
            b,
            matchId: randomUUID(),
            ratingGap: gap,
          };
        }
      }
    }

    return null;
  }

  buildFoundPayload(
    pairing: NonNullable<ReturnType<MatchmakingQueue["tryPair"]>>,
  ): { creator: MatchmakeFoundPayload; joiner: MatchmakeFoundPayload } {
    const { a, b, matchId, ratingGap } = pairing;
    const [creator, joiner] =
      a.queuedAt <= b.queuedAt ? [a, b] : [b, a];

    return {
      creator: {
        matchId,
        role: "creator",
        opponentWallet: joiner.wallet,
        opponentRating: joiner.rating,
        betLamports: creator.betLamports,
        ratingGap,
      },
      joiner: {
        matchId,
        role: "joiner",
        opponentWallet: creator.wallet,
        opponentRating: creator.rating,
        betLamports: joiner.betLamports,
        ratingGap,
      },
    };
  }

  removeBySocket(socketId: string): void {
    for (const [wallet, entry] of this.queue) {
      if (entry.socketId === socketId) this.queue.delete(wallet);
    }
  }
}

export const matchmakingQueue = new MatchmakingQueue();
