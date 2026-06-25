import type { Server } from "socket.io";
import { isGuestWallet } from "@sol-tictactoe/shared";
import { config } from "../config";
import {
  allowClientGuestIdHandshake,
  bindGuestSocket,
  releaseGuestSocket,
  resolveGuestToken,
} from "./guest-session";
import { resolvePlayerSession } from "./player-auth";

export function registerSocketAuth(io: Server): void {
  io.use(async (socket, next) => {
    const auth = socket.handshake.auth as {
      token?: string;
      guestToken?: string;
      guestId?: string;
    };

    if (auth.token) {
      const session = await resolvePlayerSession(auth.token);
      if (session) {
        socket.data.authenticatedWallet = session.wallet;
      } else if (config.requirePlayerAuth && !auth.guestToken && !auth.guestId) {
        next(new Error("Invalid or expired player session"));
        return;
      }
    }

    if (auth.guestToken) {
      const guestId = await resolveGuestToken(auth.guestToken);
      if (!guestId) {
        // Stale client token — fall through to browse-only or wallet auth.
      } else if (!(await bindGuestSocket(auth.guestToken, socket.id))) {
        next(new Error("Guest session already in use on another connection"));
        return;
      } else {
        socket.data.guestToken = auth.guestToken;
        socket.data.guestId = guestId;
      }
    } else if (
      auth.guestId &&
      isGuestWallet(auth.guestId) &&
      allowClientGuestIdHandshake()
    ) {
      socket.data.guestId = auth.guestId;
    } else if (
      config.requirePlayerAuth &&
      !socket.data.authenticatedWallet &&
      !socket.data.guestId
    ) {
      socket.data.browseOnly = true;
    }

    next();
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      void releaseGuestSocket(socket.id);
    });
  });
}
