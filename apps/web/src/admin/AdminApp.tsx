import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Eye,
  Landmark,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import { lamportsToSol } from "@sol-tictactoe/shared";
import { explorerAddressUrl } from "../config/tokens";
import { useCluster } from "../hooks/useCluster";
import { useAdmin } from "../hooks/useAdmin";
import { AdminAnalyticsPanel } from "./AdminAnalyticsPanel";
import { AdminClientsPanel } from "./AdminClientsPanel";
import { AdminEscrowStatusBanner } from "./AdminEscrowStatusBanner";
import { AdminGateLogin } from "./AdminGateLogin";
import { AdminGamesPanel } from "./AdminGamesPanel";
import { AdminModesPanel } from "./AdminModesPanel";
import { AdminHouseWalletPanel } from "./AdminHouseWalletPanel";
import { AdminLayout, AdminStatCard, type AdminTab } from "./AdminLayout";
import { AdminRakeHintBanner } from "./AdminRakeHintBanner";
import "./admin.css";

export function AdminApp() {
  const { t } = useTranslation();
  const { cluster } = useCluster();
  const {
    authenticated,
    sessionChecked,
    dashboard,
    bankLedger,
    loading,
    error,
    completeGateLogin,
    logout,
    refresh,
    saveSettings,
    initEscrow,
    walletStatus,
    refreshWallet,
    transferHouseWallet,
    clients,
    clientsTotal,
    clientsOffset,
    clientsPageSize,
    selectedClient,
    gameModeStats,
    recentGames,
    livePresence,
    dailyVisits,
    todayVisits,
    refreshAnalytics,
    searchClients,
    paginateClients,
    selectClient,
  } = useAdmin();

  const [tab, setTab] = useState<AdminTab>("overview");
  const [feeWallet, setFeeWallet] = useState("");
  const [programId, setProgramId] = useState("");
  const [mockEscrow, setMockEscrow] = useState(false);
  const [rakeBps, setRakeBps] = useState(500);
  const [activeCluster, setActiveCluster] = useState<"devnet" | "mainnet-beta">("devnet");
  const [confirmMainnet, setConfirmMainnet] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "analytics" || !authenticated) return;
    const interval = window.setInterval(() => {
      void refreshAnalytics();
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [tab, authenticated, refreshAnalytics]);

  useEffect(() => {
    if (!dashboard) return;
    setFeeWallet(dashboard.runtime.feeRecipientWallet);
    setProgramId(dashboard.runtime.programId);
    setMockEscrow(dashboard.runtime.mockEscrow);
    setRakeBps(dashboard.runtime.houseRakeBps);
    setActiveCluster(dashboard.solanaCluster === "mainnet-beta" ? "mainnet-beta" : "devnet");
    setConfirmMainnet(false);
  }, [dashboard]);

  if (!sessionChecked) {
    return (
      <div className="admin-shell admin-gate-center">
        <p className="admin-muted">{t("admin.loadingSession", { defaultValue: "Checking session…" })}</p>
      </div>
    );
  }

  if (!authenticated) {
    return <AdminGateLogin onComplete={completeGateLogin} />;
  }

  const handleSave = async () => {
    try {
      const switchingToMainnet =
        activeCluster === "mainnet-beta" &&
        dashboard?.solanaCluster !== "mainnet-beta";
      if (switchingToMainnet && !confirmMainnet) {
        setMessage(t("admin.productionNetworkConfirmRequired"));
        return;
      }
      await saveSettings({
        feeRecipientWallet: feeWallet.trim(),
        mockEscrow,
        houseRakeBps: rakeBps,
        programId: programId.trim(),
        activeCluster,
        confirmMainnet: switchingToMainnet ? true : undefined,
      });
      setMessage(t("admin.settingsSaved"));
      window.dispatchEvent(new CustomEvent("sol-ttt-config-refresh"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error");
    }
  };

  const handleInit = async () => {
    try {
      const result = await initEscrow();
      setMessage(
        result.alreadyInitialized
          ? t("admin.escrowAlreadyInit")
          : t("admin.escrowInitOk", { sig: result.signature?.slice(0, 12) }),
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error");
    }
  };

  const sessionLabel = dashboard?.session
    ? `${dashboard.session.platformId} · ${dashboard.session.actor.slice(0, 8)}…`
    : undefined;

  return (
    <AdminLayout
      tab={tab}
      onTabChange={setTab}
      sessionLabel={sessionLabel}
      dbProvider={dashboard?.database.provider}
      onRefresh={refresh}
      onLogout={logout}
    >
      {loading && !dashboard && <p className="admin-muted">{t("admin.loading")}</p>}
      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-success">{message}</p>}

      {dashboard && tab === "overview" && (
        <>
          <p className="admin-muted" style={{ marginBottom: "1rem" }}>
            {t("admin.productionNetwork")}:{" "}
            <strong>
              {dashboard.solanaCluster === "mainnet-beta"
                ? t("header.networkMainnet")
                : t("header.networkDevnet")}
            </strong>
          </p>
          <div className="admin-stats-grid" style={{ marginBottom: "1.25rem" }}>
            <AdminStatCard
              label={t("admin.statReceipts")}
              value={dashboard.stats.receipts}
              icon={Receipt}
              tone="blue"
            />
            <AdminStatCard
              label={t("admin.statPlayers")}
              value={dashboard.stats.players}
              icon={Users}
              tone="green"
            />
            <AdminStatCard
              label={t("admin.statRake")}
              value={`${lamportsToSol(dashboard.stats.totalRakeLamports).toFixed(4)} SOL`}
              icon={Wallet}
              tone="orange"
            />
            <AdminStatCard
              label={t("admin.statBank")}
              value={dashboard.stats.bankEntries}
              icon={Landmark}
              tone="purple"
            />
            <AdminStatCard
              label={t("admin.analytics.onlineNow")}
              value={livePresence?.total ?? "—"}
              icon={Activity}
              tone="cyan"
            />
            <AdminStatCard
              label={t("admin.analytics.todayViews")}
              value={todayVisits?.pageViews ?? "—"}
              icon={Eye}
              tone="blue"
            />
          </div>
        </>
      )}

      {dashboard && tab === "clients" && (
        <AdminClientsPanel
          clients={clients}
          clientsTotal={clientsTotal}
          selectedClient={selectedClient}
          loading={loading}
          onSearch={searchClients}
          onSelect={selectClient}
          onPage={paginateClients}
          pageOffset={clientsOffset}
          pageSize={clientsPageSize}
        />
      )}

      {dashboard && tab === "games" && (
        <AdminGamesPanel
          modeStats={gameModeStats}
          recentGames={recentGames}
          loading={loading}
        />
      )}

      {dashboard && tab === "modes" && (
        <AdminModesPanel onMessage={setMessage} />
      )}

      {dashboard && tab === "analytics" && (
        <AdminAnalyticsPanel
          live={livePresence}
          visits={dailyVisits}
          todayVisits={todayVisits}
          loading={loading}
        />
      )}

      {dashboard && tab === "bank" && (
        <section className="admin-section">
          <h2>{t("admin.bankTitle")}</h2>
          <p className="admin-muted">{t("admin.bankHint")}</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("admin.bankType")}</th>
                  <th>{t("admin.bankWallet")}</th>
                  <th>LAMPORTS</th>
                  <th>SOL</th>
                  <th>{t("admin.bankMatch")}</th>
                </tr>
              </thead>
              <tbody>
                {bankLedger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-muted">
                      {t("admin.bankEmpty")}
                    </td>
                  </tr>
                ) : (
                  bankLedger.map((row) => (
                    <tr key={row.id}>
                      <td>{row.type}</td>
                      <td>{row.wallet.slice(0, 8)}…</td>
                      <td>{row.lamports}</td>
                      <td>{lamportsToSol(row.lamports).toFixed(4)}</td>
                      <td>{row.matchId?.slice(0, 8) ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {dashboard && tab === "escrow" && (
        <section className="admin-section">
          <AdminEscrowStatusBanner
            status={{
              escrowReady: dashboard.escrowReady,
              mockEscrowOff: dashboard.escrow.mockEscrowOff,
              feeRecipientSet: dashboard.escrow.feeRecipientSet,
              programDeployed: dashboard.escrow.programDeployed,
              globalConfigInitialized: dashboard.escrow.globalConfigInitialized,
              clusterAligned:
                !dashboard.solanaCluster ||
                dashboard.solanaCluster === cluster,
              rpcReachable: dashboard.escrow.rpcReachable ?? true,
              missingSteps: dashboard.escrow.missingSteps,
            }}
            onRefresh={() => void refresh()}
          />
        </section>
      )}

      {dashboard && tab === "wallet" && (
        <AdminHouseWalletPanel
          status={walletStatus}
          loading={loading}
          onRefresh={refreshWallet}
          onTransfer={transferHouseWallet}
        />
      )}

      {dashboard && tab === "settings" && (
        <section className="admin-section">
          <h2>{t("admin.escrowSettings")}</h2>
          <AdminRakeHintBanner />
          <div className="admin-form-grid">
            <div className="admin-field admin-field--full">
              <span>{t("admin.productionNetwork")}</span>
              <p className="admin-muted">{t("admin.productionNetworkHint")}</p>
              <div className="network-toggle mt-2">
                {(["devnet", "mainnet-beta"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`network-toggle-btn ${activeCluster === id ? "network-toggle-btn--active" : ""}`}
                    onClick={() => {
                      setActiveCluster(id);
                      if (id === "devnet") setConfirmMainnet(false);
                    }}
                  >
                    {id === "devnet"
                      ? t("header.networkDevnet")
                      : t("header.networkMainnet")}
                  </button>
                ))}
              </div>
              {activeCluster === "mainnet-beta" &&
                dashboard.solanaCluster !== "mainnet-beta" && (
                  <label className="admin-field admin-field--checkbox mt-3">
                    <input
                      type="checkbox"
                      checked={confirmMainnet}
                      onChange={(e) => setConfirmMainnet(e.target.checked)}
                    />
                    <span>{t("admin.productionNetworkConfirm")}</span>
                  </label>
                )}
            </div>
            <label className="admin-field">
              <span>{t("admin.feeWallet")}</span>
              <input
                value={feeWallet}
                onChange={(e) => setFeeWallet(e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>{t("admin.programId")}</span>
              <input
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>{t("admin.rakeBps")}</span>
              <input
                type="number"
                value={rakeBps}
                onChange={(e) => setRakeBps(Number(e.target.value))}
              />
            </label>
            <label className="admin-field admin-field--checkbox">
              <input
                type="checkbox"
                checked={mockEscrow}
                onChange={(e) => setMockEscrow(e.target.checked)}
              />
              <span>{t("admin.mockEscrow")}</span>
            </label>
          </div>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => void handleSave()}
            >
              {t("admin.saveSettings")}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--outline"
              disabled={mockEscrow}
              onClick={() => void handleInit()}
            >
              {t("admin.initEscrow")}
            </button>
          </div>
          <div className="admin-links">
            <a
              href={explorerAddressUrl(dashboard.escrow.programId, cluster)}
              target="_blank"
              rel="noreferrer"
            >
              Program
            </a>
            <a
              href={explorerAddressUrl(dashboard.escrow.feeRecipient, cluster)}
              target="_blank"
              rel="noreferrer"
            >
              Fee wallet
            </a>
          </div>
        </section>
      )}
    </AdminLayout>
  );
}
