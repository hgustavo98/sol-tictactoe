import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MAX_AVATAR_BYTES,
  NICKNAME_MAX_LENGTH,
  type PlayerProfile,
} from "@sol-tictactoe/shared";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiBase } from "../../config/apiBase";
import { getPlayerAuthHeaders } from "../../hooks/usePlayerAuth";
import { PlayerAvatar } from "./PlayerAvatar";

interface ProfileSettingsPanelProps {
  wallet: string;
  profile: PlayerProfile | null;
  onUpdated?: (profile: PlayerProfile) => void;
  variant?: "panel" | "modal";
}

export function ProfileSettingsPanel({
  wallet,
  profile,
  onUpdated,
  variant = "panel",
}: ProfileSettingsPanelProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNickname(profile?.nickname ?? "");
    setAvatarPreview(profile?.avatarUrl ?? null);
    setError(null);
  }, [profile?.nickname, profile?.avatarUrl, wallet]);

  const onPickAvatar = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError(t("profileSettings.errors.invalidAvatar"));
        return;
      }
      if (file.size > MAX_AVATAR_BYTES) {
        setError(t("profileSettings.errors.avatarTooLarge"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAvatarPreview(reader.result);
          setError(null);
        }
      };
      reader.readAsDataURL(file);
    },
    [t],
  );

  const onSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/players/${wallet}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getPlayerAuthHeaders(),
        },
        body: JSON.stringify({
          nickname: nickname.trim() || null,
          avatarUrl: avatarPreview,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const key = `profileSettings.errors.${data.error ?? "saveFailed"}`;
        setError(t(key, { defaultValue: data.message ?? t("profileSettings.errors.saveFailed") }));
        return;
      }
      onUpdated?.(data as PlayerProfile);
    } catch {
      setError(t("profileSettings.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [avatarPreview, nickname, onUpdated, t, wallet]);

  const previewProfile: PlayerProfile = {
    wallet,
    rating: profile?.rating ?? 500,
    gamesPlayed: profile?.gamesPlayed ?? 0,
    wins: profile?.wins ?? 0,
    losses: profile?.losses ?? 0,
    draws: profile?.draws ?? 0,
    updatedAt: profile?.updatedAt ?? Date.now(),
    nickname: nickname.trim() || null,
    avatarUrl: avatarPreview,
  };

  return (
    <div
      className={
        variant === "modal" ? "profile-settings profile-settings--modal" : "profile-settings"
      }
    >
      <div className="profile-settings-avatar-row">
        <button
          type="button"
          className="profile-settings-avatar-btn"
          onClick={onPickAvatar}
          aria-label={t("profileSettings.changeAvatar")}
        >
          <PlayerAvatar profile={previewProfile} size="lg" />
          <span className="profile-settings-avatar-overlay">
            <Camera className="size-4" />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={onFileChange}
        />
        <div className="min-w-0 flex-1">
          {variant === "panel" && (
            <p className="profile-settings-hint">{t("profileSettings.walletHint")}</p>
          )}
        </div>
      </div>

      <label className="profile-settings-field">
        <span className="profile-settings-label">{t("profileSettings.nickname")}</span>
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={NICKNAME_MAX_LENGTH}
          placeholder={t("profileSettings.nicknamePlaceholder")}
          className="profile-settings-input"
        />
        <span className="profile-settings-field-hint">
          {t("profileSettings.nicknameHint")}
        </span>
      </label>

      {error && <p className="profile-settings-error">{error}</p>}

      <Button
        size="sm"
        className="w-full"
        disabled={saving}
        onClick={() => void onSave()}
      >
        {saving ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            {t("profileSettings.saving")}
          </>
        ) : (
          t("profileSettings.save")
        )}
      </Button>
    </div>
  );
}
