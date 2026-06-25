import type { Socket } from "socket.io";
import { isGuestWallet, SOCKET_EVENTS } from "@sol-tictactoe/shared";
import { config } from "../config";

export function isWalletAuthorized(socket: Socket, wallet: string): boolean {
  if (!config.requirePlayerAuth) return true;

  if (isGuestWallet(wallet)) {
    return socket.data.guestId === wallet;
  }

  return socket.data.authenticatedWallet === wallet;
}

/** Returns true when the request was rejected (caller should return early). */
export function rejectUnauthorizedWallet(
  socket: Socket,
  wallet: string,
  message = "Unauthorized — sign in with your wallet",
  options?: { silent?: boolean },
): boolean {
  if (isWalletAuthorized(socket, wallet)) return false;
  if (!options?.silent) {
    socket.emit(SOCKET_EVENTS.GAME_ERROR, { message });
  }
  return true;
}
