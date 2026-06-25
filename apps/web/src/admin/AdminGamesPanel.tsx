import { useTranslation } from "react-i18next";
import { lamportsToSol } from "@sol-tictactoe/shared";
import type { GameModeStatRow, RecentGameRow } from "../hooks/useAdmin";

interface Props {
  modeStats: GameModeStatRow[];
  recentGames: RecentGameRow[];
  loading: boolean;
}

function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString();
}

export function AdminGamesPanel({ modeStats, recentGames, loading }: Props) {
  const { t } = useTranslation();

  const totalCompleted = modeStats.reduce((sum, row) => sum + row.gamesCompleted, 0);
  const totalLobbies = modeStats.reduce((sum, row) => sum + row.lobbiesCreated, 0);

  return (
    <>
      <section className="admin-section">
        <h2>{t("admin.games.statsTitle")}</h2>
        <p className="admin-muted">{t("admin.games.statsHint")}</p>
        <div className="admin-stats-grid">
          <div className="admin-stat">
            <span>{t("admin.games.totalLobbies")}</span>
            <strong>{totalLobbies}</strong>
          </div>
          <div className="admin-stat">
            <span>{t("admin.games.totalCompleted")}</span>
            <strong>{totalCompleted}</strong>
          </div>
        </div>
        <div className="admin-table-wrap mt-3">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.games.mode")}</th>
                <th>{t("admin.games.lobbiesCreated")}</th>
                <th>{t("admin.games.gamesCompleted")}</th>
              </tr>
            </thead>
            <tbody>
              {modeStats.length === 0 ? (
                <tr>
                  <td colSpan={3} className="admin-muted">
                    {loading ? t("admin.loading") : t("admin.games.emptyModes")}
                  </td>
                </tr>
              ) : (
                modeStats.map((row) => (
                  <tr key={row.gameMode}>
                    <td>
                      {t(`modes.${row.gameMode}.title`, {
                        defaultValue: row.gameMode,
                      })}
                    </td>
                    <td>{row.lobbiesCreated}</td>
                    <td>{row.gamesCompleted}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>{t("admin.games.recentTitle")}</h2>
        <p className="admin-muted">{t("admin.games.recentHint")}</p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.games.mode")}</th>
                <th>{t("admin.games.white")}</th>
                <th>{t("admin.games.black")}</th>
                <th>{t("admin.games.bet")}</th>
                <th>{t("admin.games.pot")}</th>
                <th>{t("admin.games.winner")}</th>
                <th>{t("admin.games.when")}</th>
              </tr>
            </thead>
            <tbody>
              {recentGames.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-muted">
                    {loading ? t("admin.loading") : t("admin.games.emptyRecent")}
                  </td>
                </tr>
              ) : (
                recentGames.map((game) => (
                  <tr key={game.matchId}>
                    <td>
                      {t(`modes.${game.gameMode ?? "unknown"}.title`, {
                        defaultValue: game.gameMode ?? "—",
                      })}
                    </td>
                    <td title={game.playerWhite}>{shortWallet(game.playerWhite)}</td>
                    <td title={game.playerBlack}>{shortWallet(game.playerBlack)}</td>
                    <td>{lamportsToSol(game.betLamports).toFixed(4)}</td>
                    <td>{lamportsToSol(game.potLamports).toFixed(4)}</td>
                    <td>
                      {game.winner
                        ? shortWallet(game.winner)
                        : t("admin.games.draw")}
                    </td>
                    <td>{formatWhen(game.createdAt)}</td>
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
