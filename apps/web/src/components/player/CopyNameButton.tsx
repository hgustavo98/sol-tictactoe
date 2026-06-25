import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface CopyNameButtonProps {
  value: string;
  className?: string;
}

export function CopyNameButton({ value, className }: CopyNameButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={cn("profile-copy-name-btn", className)}
      aria-label={copied ? t("profile.copiedName") : t("profile.copyName")}
      title={copied ? t("profile.copiedName") : t("profile.copyName")}
    >
      {copied ? (
        <Check className="size-3 shrink-0" aria-hidden />
      ) : (
        <Copy className="size-3 shrink-0" aria-hidden />
      )}
    </button>
  );
}
