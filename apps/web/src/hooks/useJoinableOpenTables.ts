import type { LobbyMatch } from "@sol-tictactoe/shared";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { checkMatchOpenOnChain } from "../lib/matchEscrow";
import { useEscrowMode } from "./useEscrowMode";

/** Drops paid lobbies whose on-chain escrow is no longer joinable (stale/cancelled/occupied). */
export function useJoinableOpenTables(
  lobbies: LobbyMatch[],
  enabled: boolean,
): LobbyMatch[] {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { escrowEnabled, programId, mockEscrow } = useEscrowMode();
  const [joinableIds, setJoinableIds] = useState<Set<string> | null>(null);

  const paidLobbies = useMemo(
    () => lobbies.filter((l) => l.betLamports > 0),
    [lobbies],
  );
  const paidKey = useMemo(
    () => paidLobbies.map((l) => l.id).join(","),
    [paidLobbies],
  );

  useEffect(() => {
    if (!enabled || mockEscrow || !escrowEnabled || paidLobbies.length === 0) {
      setJoinableIds(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const checks = await Promise.all(
        paidLobbies.map(async (lobby) => {
          const ok = await checkMatchOpenOnChain(connection, {
            matchId: lobby.id,
            joiner: wallet.publicKey ?? undefined,
            expectedBetLamports: lobby.betLamports,
            programId,
          });
          return ok ? lobby.id : null;
        }),
      );
      if (!cancelled) {
        setJoinableIds(new Set(checks.filter(Boolean) as string[]));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    mockEscrow,
    escrowEnabled,
    connection,
    wallet.publicKey,
    programId,
    paidKey,
    paidLobbies,
  ]);

  return useMemo(() => {
    if (!enabled || mockEscrow || !escrowEnabled || joinableIds === null) {
      return lobbies;
    }
    return lobbies.filter(
      (l) => l.betLamports === 0 || joinableIds.has(l.id),
    );
  }, [lobbies, enabled, mockEscrow, escrowEnabled, joinableIds]);
}
