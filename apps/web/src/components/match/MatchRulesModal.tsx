import * as Dialog from "@radix-ui/react-dialog";
import { ScrollText, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { MatchRulesContent } from "./MatchRulesContent";

interface MatchRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchRulesModal({ open, onOpenChange }: MatchRulesModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Overlay className="match-rules-modal-overlay" />
      <Dialog.Content
        className="match-rules-modal-content"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="match-rules-modal-head">
          <div className="flex items-center gap-2">
            <ScrollText className="size-4 text-primary" aria-hidden />
            <Dialog.Title className="match-rules-modal-title">
              {t("profile.rules.title")}
            </Dialog.Title>
          </div>
          <Dialog.Close asChild>
            <button
              type="button"
              className="match-rules-modal-close"
              aria-label={t("wallet.close")}
            >
              <X className="size-4" />
            </button>
          </Dialog.Close>
        </div>
        <div className={cn("match-rules-modal-body custom-scrollbar")}>
          <MatchRulesContent />
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
