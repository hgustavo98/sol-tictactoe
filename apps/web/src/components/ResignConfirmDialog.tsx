import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Flag } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Acima do tabuleiro 3D e do layout do jogo. */
const RESIGN_MODAL_Z = 40_000_000;

interface ResignConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  hasBet?: boolean;
}

export function ResignConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  hasBet = false,
}: ResignConfirmDialogProps) {
  const { t } = useTranslation();

  if (typeof document === "undefined" || !open) return null;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {createPortal(
        <>
          <Dialog.Overlay
            className={cn(
              "fixed inset-0 bg-black/70 backdrop-blur-[4px]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            )}
            style={{ zIndex: RESIGN_MODAL_Z }}
          />
          <Dialog.Content
            className={cn(
              "fixed left-1/2 top-1/2 w-full max-w-[min(380px,calc(100vw-32px))]",
              "-translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rose-500/25",
              "bg-[#060e1a] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(244,63,94,0.08)]",
              "outline-none",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            )}
            style={{ zIndex: RESIGN_MODAL_Z + 1 }}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className={cn(
                  "flex size-14 items-center justify-center rounded-full",
                  "border border-rose-500/30 bg-rose-500/10 text-rose-400",
                )}
                aria-hidden
              >
                <Flag className="size-6" />
              </div>

              <div className="space-y-2">
                <Dialog.Title className="text-lg font-semibold tracking-tight text-white">
                  {t("game.resignConfirm")}
                </Dialog.Title>
                <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">
                  {hasBet
                    ? t("game.resignConfirmHintBet")
                    : t("game.resignConfirmHint")}
                </Dialog.Description>
              </div>

              <div
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left",
                  "border-amber-500/25 bg-amber-500/8 text-[0.72rem] leading-snug text-amber-100/85",
                )}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                <span>{t("game.resignForfeitWarning")}</span>
              </div>

              <div className="grid w-full grid-cols-2 gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 bg-white/5 hover:bg-white/10"
                  onClick={() => onOpenChange(false)}
                >
                  {t("game.resignCancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirm}
                >
                  <Flag className="size-3.5" />
                  {t("profile.resign")}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </>,
        document.body,
      )}
    </Dialog.Root>
  );
}
