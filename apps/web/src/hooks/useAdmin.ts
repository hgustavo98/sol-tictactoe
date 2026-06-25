import { useCallback, useEffect, useState } from "react";
import { getApiBase } from "../config/apiBase";

const ADMIN_SESSION_KEY = "sol-ttt-admin-session";

export interface AdminDashboard {
  stats: {
    receipts: number;
    players: number;
    matchLogEvents: number;
    totalRakeLamports: number;
    bankEntries: number;
    totalBankLamports: number;
  };
  database: { provider: string };
  runtime: {
    mockEscrow: boolean;
    programId: string;
    houseRakeBps: number;
    feeRecipientWallet: string;
    rpcUrl: string;
    authority: string;
    activeCluster?: "devnet" | "mainnet-beta";
  };
  escrow: import("@sol-tictactoe/shared").EscrowDiagnostics;
  escrowReady: boolean;
  solanaCluster?: "devnet" | "testnet" | "mainnet-beta";
  session?: { actor: string; platformId: string };
}

export interface BankLedgerRow {
  id: string;
  type: string;
  matchId?: string;
  wallet: string;
  lamports: number;
  signature?: string;
  createdAt: number;
}

export interface ClientSummary {
  wallet: string;
  nickname?: string | null;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalSpentLamports: number;
  paidGames: number;
  lastSeenAt?: number;
  lastGameAt?: number;
}

export interface ClientGameRow {
  matchId: string;
  betLamports: number;
  potLamports: number;
  rakeLamports: number;
  role: "white" | "black";
  opponent: string;
  won: boolean | null;
  createdAt: number;
  gameMode?: string;
}

export interface ClientDetail {
  profile: {
    wallet: string;
    nickname?: string | null;
    rating: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    updatedAt: number;
  };
  totalSpentLamports: number;
  paidGames: number;
  recentGames: ClientGameRow[];
}

export interface GameModeStatRow {
  gameMode: string;
  lobbiesCreated: number;
  gamesCompleted: number;
}

export interface RecentGameRow {
  matchId: string;
  playerWhite: string;
  playerBlack: string;
  winner?: string;
  betLamports: number;
  potLamports: number;
  rakeLamports: number;
  createdAt: number;
  gameMode?: string;
}

export interface DailyVisitRow {
  day: string;
  pageViews: number;
  uniqueVisitors: number;
}

export interface LivePresenceRow {
  socketId: string;
  wallet?: string;
  guestId?: string;
  authenticated: boolean;
  connectedAt: number;
  lastSeenAt: number;
}

export interface LivePresenceSnapshot {
  total: number;
  authenticated: number;
  guests: number;
  anonymous: number;
  items: LivePresenceRow[];
}

export type HouseWalletSource = "fee" | "authority" | "treasury";

export interface HouseWalletStatus {
  limits: {
    minReserveLamports: number;
    txFeeBufferLamports: number;
    maxPerTransferLamports: number;
    dailyCapLamports: number;
    dailyUsedLamports: number;
    dailyRemainingLamports: number;
  };
  sources: Array<{
    id: HouseWalletSource;
    address: string;
    balanceLamports: number;
    maxWithdrawLamports: number;
    canWithdraw: boolean;
    custodial: boolean;
    blockedReason?: string;
    ledgerRakeLamports?: number;
    ledgerWithdrawnLamports?: number;
  }>;
  mockEscrow: boolean;
}

export function getAdminSession(): string | null {
  return sessionStorage.getItem(ADMIN_SESSION_KEY);
}

export function setAdminSession(token: string): void {
  sessionStorage.setItem(ADMIN_SESSION_KEY, token);
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAdminSession();
  if (!token) throw new Error("Sessão admin necessária");

  const res = await fetch(`${getApiBase()}/api/admin${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Admin request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export function useAdmin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [bankLedger, setBankLedger] = useState<BankLedgerRow[]>([]);
  const [walletStatus, setWalletStatus] = useState<HouseWalletStatus | null>(null);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [clientsOffset, setClientsOffset] = useState(0);
  const [clientsSearch, setClientsSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [gameModeStats, setGameModeStats] = useState<GameModeStatRow[]>([]);
  const [recentGames, setRecentGames] = useState<RecentGameRow[]>([]);
  const [livePresence, setLivePresence] = useState<LivePresenceSnapshot | null>(null);
  const [dailyVisits, setDailyVisits] = useState<DailyVisitRow[]>([]);
  const [todayVisits, setTodayVisits] = useState<DailyVisitRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    const token = getAdminSession();
    if (token) {
      void fetch(`${getApiBase()}/api/admin/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    clearAdminSession();
    sessionStorage.removeItem("sol-ttt-admin-gate-flow");
    setAuthenticated(false);
    setDashboard(null);
  }, []);

  const CLIENTS_PAGE_SIZE = 50;

  const loadClients = useCallback(
    async (offset = clientsOffset, search = clientsSearch) => {
      const result = await adminFetch<{ items: ClientSummary[]; total: number }>(
        `/clients?limit=${CLIENTS_PAGE_SIZE}&offset=${offset}${
          search ? `&search=${encodeURIComponent(search)}` : ""
        }`,
      );
      setClients(result.items);
      setClientsTotal(result.total);
      setClientsOffset(offset);
    },
    [clientsOffset, clientsSearch],
  );

  const loadClientDetail = useCallback(async (wallet: string) => {
    const detail = await adminFetch<ClientDetail>(
      `/clients/${encodeURIComponent(wallet)}`,
    );
    setSelectedClient(detail);
  }, []);

  const loadGamesStats = useCallback(async () => {
    const result = await adminFetch<{
      modes: GameModeStatRow[];
      recent: RecentGameRow[];
    }>("/games/stats?recentLimit=30");
    setGameModeStats(result.modes);
    setRecentGames(result.recent);
  }, []);

  const loadAnalytics = useCallback(async () => {
    const [live, visits] = await Promise.all([
      adminFetch<LivePresenceSnapshot>("/analytics/live"),
      adminFetch<{ items: DailyVisitRow[]; today: DailyVisitRow }>(
        "/analytics/visits?days=14",
      ),
    ]);
    setLivePresence(live);
    setDailyVisits(visits.items);
    setTodayVisits(visits.today);
  }, []);

  const refresh = useCallback(async () => {
    if (!getAdminSession()) return;
    setLoading(true);
    setError(null);
    try {
      const [dash, bank, wallet] = await Promise.all([
        adminFetch<AdminDashboard>("/dashboard?fresh=1"),
        adminFetch<{ items: BankLedgerRow[] }>("/bank?limit=20"),
        adminFetch<HouseWalletStatus>("/wallet/status"),
        loadClients(clientsOffset, clientsSearch),
        loadGamesStats(),
        loadAnalytics(),
      ]);
      setDashboard(dash);
      setBankLedger(bank.items);
      setWalletStatus(wallet);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin");
      if (String(err).includes("401")) logout();
    } finally {
      setLoading(false);
    }
  }, [
    logout,
    loadClients,
    loadGamesStats,
    loadAnalytics,
    clientsOffset,
    clientsSearch,
  ]);

  useEffect(() => {
    const token = getAdminSession();
    if (!token) {
      setSessionChecked(true);
      return;
    }
    void adminFetch<AdminDashboard>("/dashboard")
      .then(() => setAuthenticated(true))
      .catch(() => {
        clearAdminSession();
        setAuthenticated(false);
      })
      .finally(() => setSessionChecked(true));
  }, []);

  useEffect(() => {
    if (authenticated) void refresh();
  }, [authenticated, refresh]);

  const completeGateLogin = useCallback((token: string) => {
    setAdminSession(token);
    setAuthenticated(true);
    setError(null);
  }, []);

  const saveSettings = useCallback(
    async (settings: {
      feeRecipientWallet?: string;
      mockEscrow?: boolean;
      houseRakeBps?: number;
      programId?: string;
      activeCluster?: "devnet" | "mainnet-beta";
      confirmMainnet?: boolean;
    }) => {
      await adminFetch("/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      window.dispatchEvent(new CustomEvent("sol-ttt-config-refresh"));
      await refresh();
    },
    [refresh],
  );

  const initEscrow = useCallback(async () => {
    const result = await adminFetch<{
      ok: boolean;
      signature?: string;
      alreadyInitialized?: boolean;
    }>("/escrow/init", { method: "POST" });
    await refresh();
    return result;
  }, [refresh]);

  const refreshWallet = useCallback(async () => {
    const wallet = await adminFetch<HouseWalletStatus>("/wallet/status");
    setWalletStatus(wallet);
  }, []);

  const transferHouseWallet = useCallback(
    async (input: {
      source: HouseWalletSource;
      destination: string;
      amountLamports: number;
    }) => {
      const result = await adminFetch<{ ok: boolean; signature: string }>(
        "/wallet/transfer",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
      await refresh();
      return result;
    },
    [refresh],
  );

  const refreshAnalytics = useCallback(async () => {
    try {
      await loadAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    }
  }, [loadAnalytics]);

  const searchClients = useCallback(
    async (search: string) => {
      setClientsSearch(search);
      try {
        await loadClients(0, search);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load clients");
      }
    },
    [loadClients],
  );

  const paginateClients = useCallback(
    async (offset: number) => {
      try {
        await loadClients(offset, clientsSearch);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load clients");
      }
    },
    [loadClients, clientsSearch],
  );

  const selectClient = useCallback(
    async (wallet: string) => {
      try {
        await loadClientDetail(wallet);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load client");
      }
    },
    [loadClientDetail],
  );

  return {
    authenticated,
    sessionChecked,
    dashboard,
    bankLedger,
    walletStatus,
    clients,
    clientsTotal,
    clientsOffset,
    clientsPageSize: CLIENTS_PAGE_SIZE,
    selectedClient,
    gameModeStats,
    recentGames,
    livePresence,
    dailyVisits,
    todayVisits,
    loading,
    error,
    completeGateLogin,
    logout,
    refresh,
    refreshWallet,
    refreshAnalytics,
    searchClients,
    paginateClients,
    selectClient,
    saveSettings,
    initEscrow,
    transferHouseWallet,
  };
}
