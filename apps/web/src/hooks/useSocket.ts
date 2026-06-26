import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  type GameOverResult,
  type GameState,
  type LobbyMatch,
} from "@sol-tictactoe/shared";
import { getSocketBase } from "../config/apiBase";
import { getGuestSession, refreshGuestSession } from "./useGuestId";
import { loadPlayerSession } from "./playerAuthStorage";

export interface SocketAuthPayload {
  token?: string;
  guestToken?: string;
  guestId?: string;
}

function loadInitialSocketAuth(): SocketAuthPayload {
  const walletSession = loadPlayerSession();
  if (walletSession?.token && walletSession.expiresAt > Date.now()) {
    return { token: walletSession.token };
  }
  const guestSession = getGuestSession();
  if (guestSession?.token) {
    return { guestToken: guestSession.token };
  }
  return {};
}

function attachSocketErrorRecovery(socket: Socket): void {
  socket.on("connect_error", (err: Error) => {
    const msg = err.message ?? "";
    if (!/guest session/i.test(msg)) return;
    void refreshGuestSession();
  });
}

let socketInstance: Socket | null = null;
let socketAuth: SocketAuthPayload = loadInitialSocketAuth();

function buildSocket(): Socket {
  const url = getSocketBase() || undefined;
  const socket = io(url, {
    transports: ["websocket", "polling"],
    auth: { ...socketAuth },
    autoConnect: false,
  });
  attachSocketErrorRecovery(socket);
  return socket;
}

function reconnectSocketWithAuth(): void {
  if (!socketInstance) return;
  if (socketInstance.connected) socketInstance.disconnect();
  socketInstance.connect();
}

/** Wait until the socket is connected (after auth refresh / reconnect). */
export function waitForSocketConnected(
  socket: Socket,
  timeoutMs = 8_000,
): Promise<boolean> {
  if (socket.connected) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("connect", onConnect);
      socket.off("connect_error", onFail);
      resolve(ok);
    };
    const onConnect = () => finish(true);
    const onFail = () => finish(false);
    const timer = window.setTimeout(() => finish(false), timeoutMs);

    socket.on("connect", onConnect);
    socket.on("connect_error", onFail);
    if (!socket.active) socket.connect();
  });
}

/** Update handshake auth and reconnect if credentials changed. */
export function syncSocketAuth(auth: SocketAuthPayload): void {
  const prevToken = socketAuth.token;
  const prevGuest = socketAuth.guestId;
  const prevGuestToken = socketAuth.guestToken;
  socketAuth = { ...auth };

  if (
    prevToken === auth.token &&
    prevGuest === auth.guestId &&
    prevGuestToken === auth.guestToken
  ) {
    return;
  }

  if (!socketInstance) return;

  socketInstance.auth = { ...socketAuth };
  reconnectSocketWithAuth();
}

export function useSocket(): Socket {
  if (!socketInstance) {
    socketInstance = buildSocket();
    socketInstance.connect();
  }
  return socketInstance;
}

export function useLobbies(socket: Socket) {
  const [lobbies, setLobbies] = useState<LobbyMatch[]>([]);

  useEffect(() => {
    const apply = (list: LobbyMatch[]) => setLobbies(list);

    socket.on(SOCKET_EVENTS.LOBBY_LIST, apply);
    socket.on(SOCKET_EVENTS.LOBBY_UPDATE, apply);

    const sync = () => socket.emit(SOCKET_EVENTS.LOBBY_SYNC);
    socket.on("connect", sync);
    if (socket.connected) sync();

    return () => {
      socket.off(SOCKET_EVENTS.LOBBY_LIST, apply);
      socket.off(SOCKET_EVENTS.LOBBY_UPDATE, apply);
      socket.off("connect", sync);
    };
  }, [socket]);

  return lobbies;
}

/** @deprecated use useLobbies */
export const useLobby = useLobbies;

export function useGame(matchId: string | null) {
  const socket = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!matchId) {
      setGameState(null);
      return;
    }

    const onState = (state: GameState) => {
      if (state.matchId === matchId) setGameState(state);
    };

    socket.on(SOCKET_EVENTS.GAME_STATE, onState);
    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE, onState);
    };
  }, [socket, matchId]);

  return { gameState, setGameState };
}

export function useGameOver(matchId: string | null) {
  const socket = useSocket();
  const [gameOver, setGameOver] = useState<GameOverResult | null>(null);

  useEffect(() => {
    if (!matchId) {
      setGameOver(null);
      return;
    }

    const onOver = (payload: GameOverResult) => {
      if (payload.state.matchId === matchId) setGameOver(payload);
    };

    socket.on(SOCKET_EVENTS.GAME_OVER, onOver);
    return () => {
      socket.off(SOCKET_EVENTS.GAME_OVER, onOver);
    };
  }, [socket, matchId]);

  return gameOver;
}

export function useGameSession(matchId: string | null, wallet: string | null) {
  const socket = useSocket();
  const { gameState, setGameState } = useGame(matchId);
  const gameOver = useGameOver(matchId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId || !wallet) return;

    const onError = (payload: { message: string }) =>
      setError(payload.message);

    socket.on(SOCKET_EVENTS.GAME_ERROR, onError);
    socket.emit(SOCKET_EVENTS.GAME_JOIN, { matchId, wallet });

    return () => {
      socket.off(SOCKET_EVENTS.GAME_ERROR, onError);
    };
  }, [socket, matchId, wallet]);

  return { gameState, gameOver, error, setGameState, setError };
}
