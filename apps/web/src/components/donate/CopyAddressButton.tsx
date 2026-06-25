import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface CopyAddressButtonProps {
  value: string;
  className?: string;
}

export function CopyAddressButton({ value, className }: CopyAddressButtonProps) {
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
      className={cn("donate-copy-btn", className)}
      aria-label={copied ? t("donate.copied") : t("donate.copy")}
      title={copied ? t("donate.copied") : t("donate.copy")}
    >
      {copied ? (
        <Check className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Copy className="size-3.5 shrink-0" aria-hidden />
      )}
    </button>
  );
}
