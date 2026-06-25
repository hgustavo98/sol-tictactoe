import { useEffect, useMemo, useState } from "react";
import type { PlayerProfile } from "@sol-tictactoe/shared";
import { getApiBase } from "../config/apiBase";

export function usePlayerProfilesBatch(wallets: (string | undefined | null)[]) {
  const unique = useMemo(
    () => [...new Set(wallets.filter(Boolean) as string[])],
    [wallets],
  );
  const walletsKey = unique.join(",");
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});

  useEffect(() => {
    if (unique.length === 0) {
      setProfiles({});
      return;
    }

    let cancelled = false;
    void fetch(
      `${getApiBase()}/api/players/batch?wallets=${encodeURIComponent(unique.join(","))}`,
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((list: PlayerProfile[]) => {
        if (cancelled) return;
        const map: Record<string, PlayerProfile> = {};
        for (const p of list) map[p.wallet] = p;
        setProfiles(map);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [walletsKey, unique.length]);

  return profiles;
}
