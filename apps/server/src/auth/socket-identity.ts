import type { Socket } from "socket.io";

export function socketIdentity(socket: Socket): string | undefined {
  const wallet = socket.data.authenticatedWallet as string | undefined;
  if (wallet) return wallet;
  return socket.data.guestId as string | undefined;
}
