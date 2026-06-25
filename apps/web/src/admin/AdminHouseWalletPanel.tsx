import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { lamportsToSol, solToLamports } from "@sol-tictactoe/shared";
import { explorerAddressUrl, explorerTxUrl } from "../config/tokens";
import { useCluster } from "../hooks/useCluster";
import type { HouseWalletSource, HouseWalletStatus } from "../hooks/useAdmin";

interface AdminHouseWalletPanelProps {
  status: HouseWalletStatus | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onTransfer: (input: {
    source: HouseWalletSource;
    destination: string;
    amountLamports: number;
  }) => Promise<{ signature: string }>;
}

function solFmt(lamports: number): string {
  return lamportsToSol(lamports).toFixed(6);
}

export function AdminHouseWalletPanel({
  status,
  loading,
  onRefresh,
  onTransfer,
}: AdminHouseWalletPanelProps) {
  const { t } = useTranslation();
  const { cluster } = useCluster();
  const [source, setSource] = useState<HouseWalletSource>("fee");
  const [destination, setDestination] = useState("");
  const [amountSol, setAmountSol] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastSig, setLastSig] = useState<string | null>(null);

  const selected = useMemo(
    () => status?.sources.find((s) => s.id === source),
    [status, source],
  );

  useEffect(() => {
    if (!status) return;
    const preferred =
      status.sources.find((s) => s.id === "fee" && s.canWithdraw) ??
      status.sources.find((s) => s.canWithdraw) ??
      status.sources[0];
    if (preferred) setSource(preferred.id);
  }, [status]);

  const fillMax = useCallback(() => {
    if (!selected?.maxWithdrawLamports) return;
    setAmountSol(lamportsToSol(selected.maxWithdrawLamports).toFixed(6));
  }, [selected]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setMessage(null);
    setLastSig(null);
    try {
      const lamports = solToLamports(Number.parseFloat(amountSol));
      if (!Number.isFinite(lamports) || lamports <= 0) {
        throw new Error(t("admin.wallet.invalidAmount"));
      }
      if (lamports > selected.maxWithdrawLamports) {
        throw new Error(t("admin.wallet.exceedsMax"));
      }
      const result = await onTransfer({
        source,
        destination: destination.trim(),
        amountLamports: lamports,
      });
      setLastSig(result.signature);
      setMessage(t("admin.wallet.transferOk"));
      setAmountSol("");
      await onRefresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("admin.wallet.transferFail"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!status) {
    return <p className="admin-muted">{t("admin.loading")}</p>;
  }

  const { limits } = status;

  return (
    <div className="admin-wallet-panel">
      <section className="admin-section">
        <div className="admin-wallet-header">
          <h2>{t("admin.wallet.title")}</h2>
          <button
            type="button"
            className="admin-btn"
            disabled={loading}
            onClick={() => void onRefresh()}
          >
            {t("admin.refresh")}
          </button>
        </div>
        <p className="admin-muted">{t("admin.wallet.hint")}</p>
        {status.mockEscrow && (
          <p className="admin-error">{t("admin.wallet.mockBlocked")}</p>
        )}
      </section>

      <section className="admin-section admin-wallet-limits">
        <h3>{t("admin.wallet.limitsTitle")}</h3>
        <ul className="admin-wallet-limit-list">
          <li>
            {t("admin.wallet.limitReserve", { sol: solFmt(limits.minReserveLamports) })}
          </li>
          <li>
            {t("admin.wallet.limitTxBuffer", {
              sol: solFmt(limits.txFeeBufferLamports),
            })}
          </li>
          <li>
            {t("admin.wallet.limitPerTx", {
              sol: solFmt(limits.maxPerTransferLamports),
            })}
          </li>
          <li>
            {t("admin.wallet.limitDaily", {
              sol: solFmt(limits.dailyCapLamports),
            })}
          </li>
          <li>
            {t("admin.wallet.limitDailyUsed", {
              sol: solFmt(limits.dailyUsedLamports),
            })}
          </li>
          <li>
            <strong>
              {t("admin.wallet.limitDailyRemaining", {
                sol: solFmt(limits.dailyRemainingLamports),
              })}
            </strong>
          </li>
        </ul>
        <p className="admin-muted admin-wallet-limit-foot">
          {t("admin.wallet.limitsFootnote")}
        </p>
      </section>

      <section className="admin-section">
        <h3>{t("admin.wallet.balancesTitle")}</h3>
        <div className="admin-stats-grid admin-wallet-sources">
          {status.sources.map((src) => (
            <div
              key={src.id}
              className={`admin-stat admin-wallet-source ${
                source === src.id ? "admin-wallet-source--active" : ""
              }`}
            >
              <button
                type="button"
                className="admin-wallet-source-btn"
                onClick={() => setSource(src.id)}
              >
                <span>{t(`admin.wallet.source.${src.id}`)}</span>
                <strong>{solFmt(src.balanceLamports)} SOL</strong>
                <span className="admin-muted">
                  {t("admin.wallet.maxWithdraw")}: {solFmt(src.maxWithdrawLamports)} SOL
                </span>
                {src.id === "fee" && src.ledgerRakeLamports != null && (
                  <span className="admin-muted">
                    {t("admin.wallet.ledgerRake")}: {solFmt(src.ledgerRakeLamports)} SOL
                  </span>
                )}
                {!src.canWithdraw && src.blockedReason && (
                  <span className="admin-wallet-blocked">
                    {t(`admin.wallet.blocked.${src.blockedReason}`)}
                  </span>
                )}
              </button>
              {src.address !== "—" && (
                <a
                  href={explorerAddressUrl(src.address, cluster)}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-wallet-explorer"
                >
                  {src.address.slice(0, 8)}…
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <h3>{t("admin.wallet.transferTitle")}</h3>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>{t("admin.wallet.destination")}</span>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={t("admin.wallet.destinationPlaceholder")}
            />
          </label>
          <label className="admin-field">
            <span>{t("admin.wallet.amountSol")}</span>
            <div className="admin-wallet-amount-row">
              <input
                type="number"
                min={0}
                step="0.000001"
                value={amountSol}
                onChange={(e) => setAmountSol(e.target.value)}
              />
              <button
                type="button"
                className="admin-btn"
                disabled={!selected?.maxWithdrawLamports}
                onClick={fillMax}
              >
                {t("admin.wallet.maxButton")}
              </button>
            </div>
            {selected && (
              <span className="admin-muted">
                {t("admin.wallet.maxHint", {
                  sol: solFmt(selected.maxWithdrawLamports),
                })}
              </span>
            )}
          </label>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={submitting || !selected?.canWithdraw || !destination.trim()}
            onClick={() => void handleSubmit()}
          >
            {submitting ? t("admin.wallet.sending") : t("admin.wallet.send")}
          </button>
        </div>
        {message && (
          <p className={lastSig ? "admin-success" : "admin-error"}>{message}</p>
        )}
        {lastSig && (
          <a
            href={explorerTxUrl(lastSig, cluster)}
            target="_blank"
            rel="noreferrer"
            className="admin-wallet-explorer"
          >
            {t("admin.wallet.viewTx")}: {lastSig.slice(0, 16)}…
          </a>
        )}
      </section>
    </div>
  );
}
