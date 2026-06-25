import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { PlayerProfile } from "@sol-tictactoe/shared";
import { cn } from "@/lib/utils";
import { ProfileSettingsPanel } from "../player/ProfileSettingsPanel";

const PROFILE_EDIT_Z = 50_000_001;

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: string;
  profile: PlayerProfile | null;
  onboarding?: boolean;
}

export function ProfileEditModal({
  open,
  onOpenChange,
  wallet,
  profile,
  onboarding = false,
}: ProfileEditModalProps) {
  const { t } = useTranslation();

  if (typeof document === "undefined" || !open) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {createPortal(
        <>
          <Dialog.Overlay
            className={cn(
              "wallet-modal-overlay fixed inset-0 bg-black/70 backdrop-blur-xs",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            )}
            style={{ zIndex: PROFILE_EDIT_Z }}
          />
          <Dialog.Content
            className={cn(
              "profile-edit-dialog fixed left-1/2 top-1/2 w-[min(92vw,24rem)]",
              "-translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10",
              "bg-[#1a0808] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.55)]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            )}
            style={{ zIndex: PROFILE_EDIT_Z + 1 }}
          >
            <div className="profile-edit-head">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="profile-edit-title">
                  {onboarding
                    ? t("profileSettings.onboardingTitle")
                    : t("profileSettings.editTitle")}
                </Dialog.Title>
                <Dialog.Description className="profile-edit-subtitle">
                  {onboarding
                    ? t("profileSettings.onboardingSubtitle")
                    : t("profileSettings.editSubtitle")}
                </Dialog.Description>
              </div>
              <Dialog.Close
                type="button"
                className="wallet-menu-close"
                aria-label={t("wallet.close")}
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>

            <ProfileSettingsPanel
              wallet={wallet}
              profile={profile}
              variant="modal"
              onUpdated={() => onOpenChange(false)}
            />
          </Dialog.Content>
        </>,
        document.body,
      )}
    </Dialog.Root>
  );
}
