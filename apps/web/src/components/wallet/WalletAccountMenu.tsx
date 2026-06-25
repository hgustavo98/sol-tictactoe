import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { LogOut, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  displayPlayerName,
  shortenAddress,
  type PlayerProfile,
} from "@sol-tictactoe/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "../player/PlayerAvatar";

function shortenButtonAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

interface WalletAccountMenuProps {
  wallet: string;
  profile: PlayerProfile | null;
  className?: string;
  onEditProfile: () => void;
  onLogout: () => void;
}

export function WalletAccountMenu({
  wallet,
  profile,
  className,
  onEditProfile,
  onLogout,
}: WalletAccountMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({});

  const updatePopupPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setPopupStyle({
      top: rect.bottom + 7,
      right: Math.max(12, window.innerWidth - rect.right),
      width: `min(18rem, calc(100vw - 1.5rem))`,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePopupPosition();

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const popup = document.getElementById("wallet-account-popup");
      if (popup?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, updatePopupPosition]);

  const label = displayPlayerName(
    profile ?? { wallet, nickname: null },
    shortenAddress(wallet, 4),
  );

  const popup =
    open && typeof document !== "undefined" ? (
      <div
        id="wallet-account-popup"
        className="wallet-account-popup wallet-account-popup--fixed"
        style={popupStyle}
        role="menu"
      >
        <div className="wallet-menu-head">
          <PlayerAvatar profile={profile ?? { wallet }} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="wallet-menu-title truncate">{label}</p>
            <p className="wallet-menu-wallet font-mono">
              {shortenAddress(wallet, 6)}
            </p>
          </div>
        </div>

        <div className="wallet-menu-actions">
          <Button
            type="button"
            variant="outline"
            role="menuitem"
            className="wallet-menu-btn w-full justify-start gap-2"
            onClick={() => {
              setOpen(false);
              onEditProfile();
            }}
          >
            <Pencil className="size-4 shrink-0" />
            {t("wallet.editProfile")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            role="menuitem"
            className="wallet-menu-btn w-full justify-start gap-2"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut className="size-4 shrink-0" />
            {t("wallet.logout")}
          </Button>
        </div>
      </div>
    ) : null;

  return (
    <div className="wallet-account-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            if (next) {
              requestAnimationFrame(updatePopupPosition);
            }
            return next;
          });
        }}
        className={cn(
          "rounded-xl border-2 border-[#27ae60] px-3 py-1.5",
          "bg-linear-to-b from-[#ff8c42] to-[#c4451a]",
          "font-game text-xs font-bold text-[#0a2818]",
          "shadow-[0_0_14px_rgba(46,204,113,0.35)] transition-all duration-150",
          "hover:brightness-105 active:scale-[0.98]",
          open && "brightness-105 ring-2 ring-[#ff6b35]/50",
          className,
        )}
        title={t("wallet.accountMenu")}
      >
        {shortenButtonAddress(wallet)}
      </button>

      {popup && createPortal(popup, document.body)}
    </div>
  );
}
