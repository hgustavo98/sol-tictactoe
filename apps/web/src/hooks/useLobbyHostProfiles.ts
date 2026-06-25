import { useEffect, useMemo, useState } from "react";
import type { LobbyMatch, PlayerProfile } from "@sol-tictactoe/shared";
import { getApiBase } from "../config/apiBase";

export function useLobbyHostProfiles(lobbies: LobbyMatch[]) {
  const wallets = useMemo(
    () => [...new Set(lobbies.map((l) => l.player1).filter(Boolean))],
    [lobbies],
  );
  const walletsKey = wallets.join(",");
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});

  useEffect(() => {
    if (wallets.length === 0) {
      setProfiles({});
      return;
    }

    let cancelled = false;
    void fetch(
      `${getApiBase()}/api/players/batch?wallets=${encodeURIComponent(wallets.join(","))}`,
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
  }, [walletsKey, wallets.length]);

  return profiles;
}
