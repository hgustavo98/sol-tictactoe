import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GAME_MODES,
  MODE_AVAILABILITY_STATUSES,
  sortGameModesByAvailability,
  type GameModeId,
  type ModeAvailabilityMap,
  type ModeAvailabilityStatus,
} from "@sol-tictactoe/shared";
import { adminFetch } from "../hooks/useAdmin";

interface AdminSettingsResponse {
  gameModeAvailability?: ModeAvailabilityMap;
}

interface AdminModesPanelProps {
  onMessage?: (message: string | null) => void;
}

export function AdminModesPanel({ onMessage }: AdminModesPanelProps) {
  const { t } = useTranslation();
  const [availability, setAvailability] = useState<ModeAvailabilityMap>(() =>
    Object.fromEntries(GAME_MODES.map((mode) => [mode, "open"])) as ModeAvailabilityMap,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sortedModes = useMemo(
    () => sortGameModesByAvailability(GAME_MODES, availability),
    [availability],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch<AdminSettingsResponse>("/settings");
      if (data.gameModeAvailability) {
        setAvailability(data.gameModeAvailability);
      }
      onMessage?.(null);
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    void load();
  }, [load]);

  const setModeStatus = (mode: GameModeId, status: ModeAvailabilityStatus) => {
    setAvailability((prev) => ({ ...prev, [mode]: status }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminFetch("/settings", {
        method: "PUT",
        body: JSON.stringify({ gameModeAvailability: availability }),
      });
      window.dispatchEvent(new CustomEvent("sol-ttt-config-refresh"));
      onMessage?.(t("admin.modes.saved"));
      await load();
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="admin-muted">{t("admin.loading")}</p>;
  }

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <h2 className="admin-panel-title">{t("admin.modes.title")}</h2>
        <p className="admin-muted">{t("admin.modes.hint")}</p>
      </header>

      <div className="admin-modes-table-wrap">
        <table className="admin-table admin-modes-table">
          <thead>
            <tr>
              <th>{t("admin.modes.mode")}</th>
              <th>{t("admin.modes.status")}</th>
              <th>{t("admin.modes.frontend")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedModes.map((mode) => {
              const status = availability[mode] ?? "open";
              return (
                <tr key={mode}>
                  <td>
                    <strong>{t(`modes.${mode}.name`)}</strong>
                    <div className="admin-muted admin-modes-mode-id">{mode}</div>
                  </td>
                  <td>
                    <select
                      className="admin-input admin-modes-select"
                      value={status}
                      onChange={(e) =>
                        setModeStatus(mode, e.target.value as ModeAvailabilityStatus)
                      }
                    >
                      {MODE_AVAILABILITY_STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {t(`admin.modes.statusOption.${value}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="admin-muted">
                    {status === "open"
                      ? t("admin.modes.previewOpen")
                      : status === "coming_soon"
                        ? t("admin.modes.previewSoon")
                        : t("admin.modes.previewClosed")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-form-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? t("admin.loading") : t("admin.modes.save")}
        </button>
      </div>
    </section>
  );
}
