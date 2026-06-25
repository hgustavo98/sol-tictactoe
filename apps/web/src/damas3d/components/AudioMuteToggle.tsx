import { Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useDamasAudioMuted } from "../hooks/useDamasAudioMuted";

export function AudioMuteToggle() {
  const { t } = useTranslation();
  const { muted, toggleMuted } = useDamasAudioMuted();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="damas3d-audio-toggle"
      onClick={toggleMuted}
      aria-pressed={muted}
      aria-label={muted ? t("audio.unmute") : t("audio.mute")}
      title={muted ? t("audio.unmute") : t("audio.mute")}
    >
      {muted ? (
        <VolumeX className="size-3.5" />
      ) : (
        <Volume2 className="size-3.5" />
      )}
      <span className="damas3d-btn-label">
        {muted ? t("audio.unmuteShort") : t("audio.muteShort")}
      </span>
    </Button>
  );
}
