import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { lamportsToSol } from "@sol-tictactoe/shared";
import type { ClientDetail, ClientSummary } from "../hooks/useAdmin";

interface Props {
  clients: ClientSummary[];
  clientsTotal: number;
  selectedClient: ClientDetail | null;
  loading: boolean;
  onSearch: (query: string) => void;
  onSelect: (wallet: string) => void;
  onPage: (offset: number) => void;
  pageOffset: number;
  pageSize: number;
}

function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
}

function formatWhen(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export function AdminClientsPanel({
  clients,
  clientsTotal,
  selectedClient,
  loading,
  onSearch,
  onSelect,
  onPage,
  pageOffset,
  pageSize,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const submitSearch = useCallback(() => {
    onSearch(query.trim());
  }, [onSearch, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onSearch(query.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, onSearch]);

  const page = Math.floor(pageOffset / pageSize) + 1;
  const totalPages = Math.max(1, Math.ceil(clientsTotal / pageSize));

  return (
    <div className="admin-split">
      <section className="admin-section admin-split-main">
        <div className="admin-section-header">
          <h2>{t("admin.clients.title")}</h2>
          <p className="admin-muted">{t("admin.clients.hint")}</p>
        </div>
        <div className="admin-toolbar">
          <input
            className="admin-search"
            placeholder={t("admin.clients.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSearch();
            }}
          />
          <span className="admin-muted">
            {t("admin.clients.total", { count: clientsTotal })}
          </span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.clients.wallet")}</th>
                <th>{t("admin.clients.nickname")}</th>
                <th>{t("admin.clients.rating")}</th>
                <th>{t("admin.clients.games")}</th>
                <th>{t("admin.clients.spent")}</th>
                <th>{t("admin.clients.lastGame")}</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-muted">
                    {loading ? t("admin.loading") : t("admin.clients.empty")}
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.wallet}
                    className={
                      selectedClient?.profile.wallet === client.wallet
                        ? "admin-table-row--active"
                        : "admin-table-row--clickable"
                    }
                    onClick={() => onSelect(client.wallet)}
                  >
                    <td title={client.wallet}>{shortWallet(client.wallet)}</td>
                    <td>{client.nickname ?? "—"}</td>
                    <td>{client.rating}</td>
                    <td>
                      {client.gamesPlayed}
                      {client.paidGames > 0 && (
                        <span className="admin-muted">
                          {" "}
                          ({client.paidGames} {t("admin.clients.paid")})
                        </span>
                      )}
                    </td>
                    <td>{lamportsToSol(client.totalSpentLamports).toFixed(4)} SOL</td>
                    <td>{formatWhen(client.lastGameAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <button
            type="button"
            className="admin-btn"
            disabled={pageOffset <= 0}
            onClick={() => onPage(Math.max(0, pageOffset - pageSize))}
          >
            {t("admin.clients.prev")}
          </button>
          <span className="admin-muted">
            {t("admin.clients.page", { page, total: totalPages })}
          </span>
          <button
            type="button"
            className="admin-btn"
            disabled={pageOffset + pageSize >= clientsTotal}
            onClick={() => onPage(pageOffset + pageSize)}
          >
            {t("admin.clients.next")}
          </button>
        </div>
      </section>

      {selectedClient && (
        <aside className="admin-section admin-split-side">
          <h2>{t("admin.clients.detailTitle")}</h2>
          <div className="admin-detail-grid">
            <div>
              <span className="admin-muted">{t("admin.clients.wallet")}</span>
              <code className="admin-mono">{selectedClient.profile.wallet}</code>
            </div>
            <div>
              <span className="admin-muted">{t("admin.clients.nickname")}</span>
              <strong>{selectedClient.profile.nickname ?? "—"}</strong>
            </div>
            <div>
              <span className="admin-muted">{t("admin.clients.rating")}</span>
              <strong>{selectedClient.profile.rating}</strong>
            </div>
            <div>
              <span className="admin-muted">{t("admin.clients.record")}</span>
              <strong>
                {selectedClient.profile.wins}W / {selectedClient.profile.losses}L /{" "}
                {selectedClient.profile.draws}D
              </strong>
            </div>
            <div>
              <span className="admin-muted">{t("admin.clients.spent")}</span>
              <strong>
                {lamportsToSol(selectedClient.totalSpentLamports).toFixed(4)} SOL
              </strong>
            </div>
            <div>
              <span className="admin-muted">{t("admin.clients.paidGames")}</span>
              <strong>{selectedClient.paidGames}</strong>
            </div>
          </div>

          <h3 className="admin-subheading">{t("admin.clients.recentGames")}</h3>
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--compact">
              <thead>
                <tr>
                  <th>{t("admin.games.mode")}</th>
                  <th>{t("admin.games.bet")}</th>
                  <th>{t("admin.games.result")}</th>
                  <th>{t("admin.games.when")}</th>
                </tr>
              </thead>
              <tbody>
                {selectedClient.recentGames.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-muted">
                      {t("admin.clients.noGames")}
                    </td>
                  </tr>
                ) : (
                  selectedClient.recentGames.map((game) => (
                    <tr key={game.matchId}>
                      <td>
                        {t(`modes.${game.gameMode ?? "unknown"}.title`, {
                          defaultValue: game.gameMode ?? "—",
                        })}
                      </td>
                      <td>{lamportsToSol(game.betLamports).toFixed(4)}</td>
                      <td>
                        {game.won === null
                          ? "—"
                          : game.won
                            ? t("admin.games.won")
                            : t("admin.games.lost")}
                      </td>
                      <td>{formatWhen(game.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </aside>
      )}
    </div>
  );
}
