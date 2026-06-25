import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, XCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CANCEL_MODAL_Z = 40_000_000;

interface CancelTableConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  refundWaitLabel?: string;
  refundThresholdLabel?: string;
}

export function CancelTableConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  refundWaitLabel = "0:00",
  refundThresholdLabel = "1:30",
}: CancelTableConfirmDialogProps) {
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
              "fixed inset-0 bg-black/75 backdrop-blur-[5px]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            )}
            style={{ zIndex: CANCEL_MODAL_Z }}
          />
          <Dialog.Content
            className={cn(
              "fixed left-1/2 top-1/2 w-full max-w-[min(400px,calc(100vw-32px))]",
              "-translate-x-1/2 -translate-y-1/2 rounded-2xl border border-amber-500/30",
              "bg-[#060e1a] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(245,158,11,0.1)]",
              "outline-none",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            )}
            style={{ zIndex: CANCEL_MODAL_Z + 1 }}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className={cn(
                  "flex size-14 items-center justify-center rounded-full",
                  "border border-amber-500/35 bg-amber-500/10 text-amber-300",
                )}
                aria-hidden
              >
                <XCircle className="size-6" />
              </div>

              <div className="space-y-2">
                <Dialog.Title className="font-display text-lg font-bold tracking-tight text-white">
                  {t("waiting.cancelEarlyTitle")}
                </Dialog.Title>
                <Dialog.Description className="font-game text-sm leading-relaxed text-white/65">
                  {t("waiting.cancelEarlyDescription", {
                    remaining: refundWaitLabel,
                    waitTime: refundThresholdLabel,
                  })}
                </Dialog.Description>
              </div>

              <div
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left",
                  "border-amber-500/30 bg-amber-500/10 text-[0.72rem] leading-snug text-amber-100/90",
                )}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                <span>{t("waiting.cancelEarlyWarning")}</span>
              </div>

              <div className="grid w-full grid-cols-2 gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 bg-white/5 font-game text-xs font-bold uppercase tracking-wide hover:bg-white/10"
                  onClick={() => onOpenChange(false)}
                >
                  {t("waiting.cancelEarlyBack")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="font-game text-xs font-bold uppercase tracking-wide"
                  onClick={handleConfirm}
                >
                  <XCircle className="size-3.5" />
                  {t("waiting.cancelEarlyConfirmBtn")}
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
