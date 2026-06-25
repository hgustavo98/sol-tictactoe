import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface EscrowStatusView {
  escrowReady: boolean;
  mockEscrowOff: boolean;
  feeRecipientSet: boolean;
  programDeployed: boolean;
  globalConfigInitialized: boolean;
  clusterAligned: boolean;
  rpcReachable: boolean;
  missingSteps: string[];
}

interface AdminEscrowStatusBannerProps {
  status: EscrowStatusView;
  onRefresh?: () => void;
}

export function AdminEscrowStatusBanner({
  status,
  onRefresh,
}: AdminEscrowStatusBannerProps) {
  const { t } = useTranslation();

  const checks: Array<{
    key: string;
    ok: boolean;
    label: string;
    unknown?: boolean;
  }> = [
    {
      key: "mock",
      ok: status.mockEscrowOff,
      label: t("admin.escrowCheck.mockOff"),
    },
    {
      key: "fee",
      ok: status.feeRecipientSet,
      label: t("admin.escrowCheck.feeRecipient"),
    },
    {
      key: "program",
      ok: status.programDeployed,
      label: t("admin.escrowCheck.programDeployed"),
      unknown: !status.rpcReachable,
    },
    {
      key: "config",
      ok: status.globalConfigInitialized,
      label: t("admin.escrowCheck.globalConfig"),
      unknown: !status.rpcReachable,
    },
    {
      key: "cluster",
      ok: status.clusterAligned,
      label: t("admin.escrowCheck.clusterAligned"),
    },
  ];

  const rpcOnlyIssue =
    !status.escrowReady &&
    !status.rpcReachable &&
    status.mockEscrowOff &&
    status.feeRecipientSet;

  const variant = status.escrowReady
    ? "ready"
    : rpcOnlyIssue
      ? "rpc"
      : "warn";

  return (
    <aside
      className={`admin-escrow-banner admin-escrow-banner--${variant}`}
      role="status"
      aria-live="polite"
    >
      <div className="admin-escrow-banner-inner">
        {variant === "ready" ? (
          <CheckCircle2 className="admin-escrow-banner-icon" aria-hidden />
        ) : (
          <AlertTriangle className="admin-escrow-banner-icon" aria-hidden />
        )}
        <div className="admin-escrow-banner-content">
          <p className="admin-escrow-banner-title">
            {status.escrowReady
              ? t("admin.escrowReady")
              : rpcOnlyIssue
                ? t("admin.escrowRpcUnavailable")
                : t("admin.escrowNotReady")}
          </p>
          <p className="admin-escrow-banner-body">
            {status.escrowReady
              ? t("admin.escrowReadyHint")
              : rpcOnlyIssue
                ? t("admin.escrowRpcHint")
                : t("admin.escrowNotReadyHint")}
          </p>
          <div className="admin-escrow-banner-pills">
            {checks.map(({ key, ok, label, unknown }) => (
              <span
                key={key}
                className={`admin-escrow-banner-pill ${
                  unknown
                    ? "admin-escrow-banner-pill--unknown"
                    : ok
                      ? "admin-escrow-banner-pill--ok"
                      : "admin-escrow-banner-pill--fail"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
          {status.missingSteps.length > 0 && (
            <ul className="admin-escrow-banner-steps">
              {status.missingSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          )}
        </div>
        {onRefresh && (
          <button
            type="button"
            className="admin-escrow-banner-refresh"
            onClick={onRefresh}
            title={t("admin.refresh")}
          >
            <RefreshCw className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </aside>
  );
}
