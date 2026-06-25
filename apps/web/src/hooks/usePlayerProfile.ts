import { useEffect, useState } from "react";
import {
  isGuestWallet,
  SOCKET_EVENTS,
  type PlayerProfile,
} from "@sol-tictactoe/shared";
import { getApiBase } from "../config/apiBase";
import { loadPlayerSession } from "./playerAuthStorage";
import { useSocket } from "./useSocket";

function canSyncProfileOnSocket(wallet: string): boolean {
  if (isGuestWallet(wallet)) return true;
  const session = loadPlayerSession();
  return Boolean(
    session?.wallet === wallet && session.expiresAt > Date.now(),
  );
}

export function usePlayerProfile(wallet: string | null | undefined) {
  const socket = useSocket();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    if (!wallet) {
      setProfile(null);
      return;
    }

    const apply = (p: PlayerProfile) => {
      if (p.wallet === wallet) setProfile(p);
    };

    void fetch(`${getApiBase()}/api/players/${wallet}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p: PlayerProfile | null) => {
        if (p) apply(p);
      })
      .catch(() => {});

    if (!canSyncProfileOnSocket(wallet)) {
      return;
    }

    const onProfile = (p: PlayerProfile) => apply(p);
    const onUpdate = (p: PlayerProfile) => apply(p);

    socket.on(SOCKET_EVENTS.PLAYER_PROFILE, onProfile);
    socket.on(SOCKET_EVENTS.PLAYER_PROFILE_UPDATE, onUpdate);
    socket.emit(SOCKET_EVENTS.PLAYER_PROFILE, { wallet });

    return () => {
      socket.off(SOCKET_EVENTS.PLAYER_PROFILE, onProfile);
      socket.off(SOCKET_EVENTS.PLAYER_PROFILE_UPDATE, onUpdate);
    };
  }, [socket, wallet]);

  return profile;
}
