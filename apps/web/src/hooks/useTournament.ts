import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SOCKET_EVENTS,
  pickFeaturedTournamentQueue,
  tournamentEntryLamports,
  tournamentQueueForSize,
  type TournamentFinishedPayload,
  type TournamentMatchReadyPayload,
  type TournamentQueueStatus,
  type TournamentState,
} from "@sol-tictactoe/shared";
import type { Socket } from "socket.io-client";
import type { GameModeId } from "../config/gameModes";
import { tournamentSizeFromMode } from "../config/gameModes";

export function useTournament(
  socket: Socket,
  wallet: string | undefined,
  activeMode: GameModeId,
  onMatchReady: (ready: TournamentMatchReadyPayload) => void,
) {
  const [allQueues, setAllQueues] = useState<TournamentQueueStatus[]>([]);
  const [activeTournament, setActiveTournament] =
    useState<TournamentState | null>(null);
  const [tournamentFinished, setTournamentFinished] =
    useState<TournamentFinishedPayload | null>(null);

  const size = tournamentSizeFromMode(activeMode);

  const featuredQueue = useMemo(
    () => pickFeaturedTournamentQueue(allQueues),
    [allQueues],
  );

  const myQueue = useMemo(() => {
    if (!wallet) return null;
    return allQueues.find((q) => q.wallets.includes(wallet)) ?? null;
  }, [allQueues, wallet]);

  const queueStatus = useMemo(() => {
    if (!size) return null;
    return tournamentQueueForSize(allQueues, size) ?? null;
  }, [allQueues, size]);

  const registered = Boolean(
    wallet && myQueue && (size ? myQueue.size === size : true),
  );

  const clearTournament = useCallback(() => {
    setActiveTournament(null);
    setTournamentFinished(null);
  }, []);

  useEffect(() => {
    const onQueuesList = (queues: TournamentQueueStatus[]) => {
      setAllQueues(queues);
    };
    const onQueue = (status: TournamentQueueStatus) => {
      setAllQueues((prev) => {
        const next = prev.filter((q) => q.size !== status.size);
        return [...next, status];
      });
    };
    const onList = (list: TournamentState[]) => {
      if (!wallet) return;
      const mine = list.find(
        (t) => t.players.includes(wallet) && t.status !== "finished",
      );
      if (mine) setActiveTournament(mine);
    };
    const onUpdate = (t: TournamentState) => {
      if (wallet && t.players.includes(wallet)) {
        setActiveTournament(t);
        if (t.status === "finished") {
          setTournamentFinished((prev) =>
            prev?.tournamentId === t.id
              ? prev
              : {
                  tournamentId: t.id,
                  winner: t.winner ?? "",
                  size: t.size,
                  entryLamports: t.entryLamports,
                  prizeLamports: 0,
                },
          );
        }
      }
    };
    const onReady = (ready: TournamentMatchReadyPayload) => {
      if (ready.opponentWallet && wallet) {
        setTournamentFinished(null);
        onMatchReady(ready);
      }
    };
    const onFinished = (payload: TournamentFinishedPayload) => {
      if (!wallet) return;
      setTournamentFinished(payload);
      setActiveTournament((prev) =>
        prev && prev.id === payload.tournamentId
          ? { ...prev, status: "finished", winner: payload.winner }
          : prev,
      );
    };

    socket.on(SOCKET_EVENTS.TOURNAMENT_QUEUES_LIST, onQueuesList);
    socket.on(SOCKET_EVENTS.TOURNAMENT_QUEUE_STATUS, onQueue);
    socket.on(SOCKET_EVENTS.TOURNAMENT_LIST, onList);
    socket.on(SOCKET_EVENTS.TOURNAMENT_UPDATE, onUpdate);
    socket.on(SOCKET_EVENTS.TOURNAMENT_MATCH_READY, onReady);
    socket.on(SOCKET_EVENTS.TOURNAMENT_FINISHED, onFinished);

    return () => {
      socket.off(SOCKET_EVENTS.TOURNAMENT_QUEUES_LIST, onQueuesList);
      socket.off(SOCKET_EVENTS.TOURNAMENT_QUEUE_STATUS, onQueue);
      socket.off(SOCKET_EVENTS.TOURNAMENT_LIST, onList);
      socket.off(SOCKET_EVENTS.TOURNAMENT_UPDATE, onUpdate);
      socket.off(SOCKET_EVENTS.TOURNAMENT_MATCH_READY, onReady);
      socket.off(SOCKET_EVENTS.TOURNAMENT_FINISHED, onFinished);
    };
  }, [socket, wallet, onMatchReady]);

  const register = useCallback((overrideWallet?: string) => {
    const activeWallet = overrideWallet ?? wallet;
    if (!activeWallet || !size) return false;
    socket.emit(SOCKET_EVENTS.TOURNAMENT_REGISTER, {
      wallet: activeWallet,
      size,
      entryLamports: tournamentEntryLamports(size),
    });
    return true;
  }, [socket, wallet, size]);

  const unregister = useCallback(() => {
    if (!wallet) return;
    socket.emit(SOCKET_EVENTS.TOURNAMENT_UNREGISTER, { wallet });
  }, [socket, wallet]);

  return {
    allQueues,
    featuredQueue,
    myQueue,
    queueStatus,
    activeTournament,
    tournamentFinished,
    registered,
    register,
    unregister,
    clearTournament,
  };
}
