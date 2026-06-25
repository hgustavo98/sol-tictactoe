import { useTranslation } from "react-i18next";
import type { DailyVisitRow, LivePresenceSnapshot } from "../hooks/useAdmin";

interface Props {
  live: LivePresenceSnapshot | null;
  visits: DailyVisitRow[];
  todayVisits: DailyVisitRow | null;
  loading: boolean;
}

function shortWallet(wallet?: string): string {
  if (!wallet) return "—";
  return wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

export function AdminAnalyticsPanel({
  live,
  visits,
  todayVisits,
  loading,
}: Props) {
  const { t } = useTranslation();
  const today = todayVisits ?? {
    day: new Date().toISOString().slice(0, 10),
    pageViews: 0,
    uniqueVisitors: 0,
  };

  return (
    <>
      <section className="admin-section">
        <h2>{t("admin.analytics.liveTitle")}</h2>
        <p className="admin-muted">{t("admin.analytics.liveHint")}</p>
        <div className="admin-stats-grid">
          <div className="admin-stat admin-stat--highlight">
            <span>{t("admin.analytics.onlineNow")}</span>
            <strong>{live?.total ?? (loading ? "…" : 0)}</strong>
          </div>
          <div className="admin-stat">
            <span>{t("admin.analytics.walletSessions")}</span>
            <strong>{live?.authenticated ?? 0}</strong>
          </div>
          <div className="admin-stat">
            <span>{t("admin.analytics.guestSessions")}</span>
            <strong>{live?.guests ?? 0}</strong>
          </div>
          <div className="admin-stat">
            <span>{t("admin.analytics.anonymousSessions")}</span>
            <strong>{live?.anonymous ?? 0}</strong>
          </div>
        </div>

        <h3 className="admin-subheading">{t("admin.analytics.connections")}</h3>
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--compact">
            <thead>
              <tr>
                <th>{t("admin.analytics.identity")}</th>
                <th>{t("admin.analytics.type")}</th>
                <th>{t("admin.analytics.connectedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {!live || live.items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="admin-muted">
                    {loading ? t("admin.loading") : t("admin.analytics.noConnections")}
                  </td>
                </tr>
              ) : (
                live.items.slice(0, 40).map((row) => (
                  <tr key={row.socketId}>
                    <td title={row.wallet}>{shortWallet(row.wallet)}</td>
                    <td>
                      {row.authenticated
                        ? t("admin.analytics.typeWallet")
                        : row.guestId
                          ? t("admin.analytics.typeGuest")
                          : t("admin.analytics.typeBrowsing")}
                    </td>
                    <td>{formatWhen(row.connectedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>{t("admin.analytics.visitsTitle")}</h2>
        <p className="admin-muted">{t("admin.analytics.visitsHint")}</p>
        <div className="admin-stats-grid">
          <div className="admin-stat admin-stat--highlight">
            <span>{t("admin.analytics.todayViews")}</span>
            <strong>{today.pageViews}</strong>
          </div>
          <div className="admin-stat admin-stat--highlight">
            <span>{t("admin.analytics.todayUnique")}</span>
            <strong>{today.uniqueVisitors}</strong>
          </div>
        </div>

        <div className="admin-table-wrap mt-3">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.analytics.day")}</th>
                <th>{t("admin.analytics.pageViews")}</th>
                <th>{t("admin.analytics.uniqueVisitors")}</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr>
                  <td colSpan={3} className="admin-muted">
                    {loading ? t("admin.loading") : t("admin.analytics.noVisits")}
                  </td>
                </tr>
              ) : (
                visits.map((row) => (
                  <tr key={row.day}>
                    <td>{row.day}</td>
                    <td>{row.pageViews}</td>
                    <td>{row.uniqueVisitors}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
