import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** Acima do Html do lobby R3F; abaixo do modal de wallet. */
const GAME_MODAL_Z = 30_000_000;

interface GameBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Tabuleiro grande; sala de espera usa tamanho compacto. */
  variant?: "board" | "compact";
  /** Fechar com Escape / backdrop (padrão: true). */
  dismissible?: boolean;
}

export function GameBoardModal({
  open,
  onOpenChange,
  children,
  variant = "board",
  dismissible = true,
}: GameBoardModalProps) {
  const { t } = useTranslation();

  if (typeof document === "undefined" || !open) return null;

  const isBoard = variant === "board";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {createPortal(
        <>
          <Dialog.Overlay
            className={cn(
              "fixed inset-0 bg-black/55 backdrop-blur-[2px]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            )}
            style={{ zIndex: GAME_MODAL_Z }}
          />
          <Dialog.Content
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              "flex flex-col overflow-hidden rounded-2xl border border-white/12",
              "bg-[#060e1a] shadow-[0_24px_80px_rgba(0,0,0,0.65)] outline-none",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              isBoard
                ? "h-[min(88vh,42rem)] w-[min(96vw,56rem)]"
                : "w-[min(96vw,28rem)] max-h-[min(88vh,36rem)]",
            )}
            style={{ zIndex: GAME_MODAL_Z + 1 }}
            onPointerDownOutside={
              dismissible ? undefined : (e) => e.preventDefault()
            }
            onInteractOutside={
              dismissible ? undefined : (e) => e.preventDefault()
            }
            onEscapeKeyDown={
              dismissible ? undefined : (e) => e.preventDefault()
            }
          >
            <Dialog.Title className="sr-only">{t("game.modalTitle")}</Dialog.Title>
            <Dialog.Description className="sr-only">
              {t("game.modalDescription")}
            </Dialog.Description>

            {dismissible && (
              <Dialog.Close
                type="button"
                aria-label={t("wallet.close")}
                className={cn(
                  "absolute right-3 top-3 z-30 rounded-lg p-1.5",
                  "text-white/60 transition-colors hover:bg-white/10 hover:text-white/90",
                )}
              >
                <X className="size-4" />
              </Dialog.Close>
            )}

            <div
              className={cn(
                "game-board-modal-body min-h-0 flex-1",
                isBoard ? "h-full" : "overflow-auto p-1",
              )}
            >
              {children}
            </div>
          </Dialog.Content>
        </>,
        document.body,
      )}
    </Dialog.Root>
  );
}
