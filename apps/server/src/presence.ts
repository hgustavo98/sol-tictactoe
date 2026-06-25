export interface LivePresenceRow {
  socketId: string;
  wallet?: string;
  guestId?: string;
  authenticated: boolean;
  connectedAt: number;
  lastSeenAt: number;
}

interface PresenceEntry {
  socketId: string;
  wallet?: string;
  guestId?: string;
  authenticatedWallet?: string;
  connectedAt: number;
  lastSeenAt: number;
}

const entries = new Map<string, PresenceEntry>();

function entryToRow(entry: PresenceEntry): LivePresenceRow {
  const wallet =
    entry.wallet ?? entry.authenticatedWallet ?? entry.guestId;
  return {
    socketId: entry.socketId,
    wallet,
    guestId: entry.guestId,
    authenticated: Boolean(entry.authenticatedWallet),
    connectedAt: entry.connectedAt,
    lastSeenAt: entry.lastSeenAt,
  };
}

export function registerSocketPresence(
  socketId: string,
  meta: {
    authenticatedWallet?: string;
    guestId?: string;
    wallet?: string;
  },
): void {
  const now = Date.now();
  entries.set(socketId, {
    socketId,
    authenticatedWallet: meta.authenticatedWallet,
    guestId: meta.guestId,
    wallet: meta.wallet,
    connectedAt: now,
    lastSeenAt: now,
  });
}

export function updateSocketPresence(
  socketId: string,
  patch: { wallet?: string; guestId?: string; authenticatedWallet?: string },
): void {
  const existing = entries.get(socketId);
  if (!existing) return;
  entries.set(socketId, {
    ...existing,
    ...patch,
    lastSeenAt: Date.now(),
  });
}

export function touchSocketPresence(socketId: string): void {
  const existing = entries.get(socketId);
  if (!existing) return;
  existing.lastSeenAt = Date.now();
}

export function removeSocketPresence(socketId: string): void {
  entries.delete(socketId);
}

export function getLivePresenceSnapshot(): {
  total: number;
  authenticated: number;
  guests: number;
  anonymous: number;
  items: LivePresenceRow[];
} {
  const items = Array.from(entries.values()).map(entryToRow);
  let authenticated = 0;
  let guests = 0;
  let anonymous = 0;
  for (const row of items) {
    if (row.authenticated) authenticated += 1;
    else if (row.guestId) guests += 1;
    else anonymous += 1;
  }
  return {
    total: items.length,
    authenticated,
    guests,
    anonymous,
    items: items.sort((a, b) => b.connectedAt - a.connectedAt),
  };
}
