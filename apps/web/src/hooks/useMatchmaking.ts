import { useCallback, useEffect, useState } from "react";
import {
  SOCKET_EVENTS,
  solToLamports,
  type LobbyMatch,
  type MatchmakeFoundPayload,
  type MatchmakeStatusPayload,
} from "@sol-tictactoe/shared";
import type { Socket } from "socket.io-client";

export function useMatchmaking(
  socket: Socket,
  wallet: string | undefined,
  lobbies: LobbyMatch[],
  onCreatorMatched: (found: MatchmakeFoundPayload) => void,
  onJoinerMatched: (found: MatchmakeFoundPayload, lobby: LobbyMatch) => void,
) {
  const [queued, setQueued] = useState(false);
  const [status, setStatus] = useState<MatchmakeStatusPayload | null>(null);
  const [pendingJoin, setPendingJoin] =
    useState<MatchmakeFoundPayload | null>(null);

  const queue = useCallback(
    (betSol: number, overrideWallet?: string): boolean => {
      const activeWallet = overrideWallet ?? wallet;
      if (!activeWallet) return false;
      socket.emit(SOCKET_EVENTS.MATCHMAKE_QUEUE, {
        wallet: activeWallet,
        betLamports: solToLamports(betSol),
        ranked: true,
      });
      return true;
    },
    [socket, wallet],
  );

  const cancel = useCallback(() => {
    if (!wallet) return;
    socket.emit(SOCKET_EVENTS.MATCHMAKE_CANCEL, { wallet });
    setQueued(false);
    setStatus(null);
    setPendingJoin(null);
  }, [socket, wallet]);

  useEffect(() => {
    const onQueued = (s: MatchmakeStatusPayload) => {
      setQueued(true);
      setStatus(s);
    };
    const onStatus = (s: MatchmakeStatusPayload) => {
      setQueued(s.queued);
      setStatus(s.queued ? s : null);
    };
    const onFound = (found: MatchmakeFoundPayload) => {
      setQueued(false);
      setStatus(null);
      if (found.role === "creator") {
        onCreatorMatched(found);
      } else {
        setPendingJoin(found);
      }
    };

    socket.on(SOCKET_EVENTS.MATCHMAKE_QUEUED, onQueued);
    socket.on(SOCKET_EVENTS.MATCHMAKE_STATUS, onStatus);
    socket.on(SOCKET_EVENTS.MATCHMAKE_FOUND, onFound);

    return () => {
      socket.off(SOCKET_EVENTS.MATCHMAKE_QUEUED, onQueued);
      socket.off(SOCKET_EVENTS.MATCHMAKE_STATUS, onStatus);
      socket.off(SOCKET_EVENTS.MATCHMAKE_FOUND, onFound);
    };
  }, [socket, onCreatorMatched]);

  useEffect(() => {
    if (!pendingJoin) return;
    const lobby = lobbies.find((l) => l.id === pendingJoin.matchId);
    if (!lobby || lobby.status !== "waiting") return;
    setPendingJoin(null);
    onJoinerMatched(pendingJoin, lobby);
  }, [lobbies, pendingJoin, onJoinerMatched]);

  return { queued, status, queue, cancel, pendingJoin };
}
