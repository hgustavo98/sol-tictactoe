import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Palette, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDamasCustomization } from "../hooks/useDamasCustomization";
import { BOARD_THEMES, PIECE_SETS, resolvePieceSetTheme } from "../themes";
import type { PieceMaterialTheme } from "../types";

function piecePreviewDotStyle(material: PieceMaterialTheme): CSSProperties {
  if (!material.emissive) {
    return { background: material.color };
  }

  return {
    background: material.color,
    border: `1px solid ${material.emissive}`,
    boxShadow: `0 0 12px ${material.emissive}, 0 0 4px ${material.emissive}`,
  };
}

interface CustomizePanelProps {
  open: boolean;
  onClose: () => void;
  /** dock = abaixo do botão; game = canto do tabuleiro; popup = modal centralizado */
  placement?: "dock" | "game" | "popup";
  compact?: boolean;
  dockStyle?: CSSProperties;
}

function CustomizePanelContent({
  onClose,
  compact = false,
}: {
  onClose: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { customization, boardTheme, setBoardThemeId, setPieceSetId } =
    useDamasCustomization();

  return (
    <>
      <div className="damas3d-customize-header">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Palette className="size-4 text-primary" />
          {t("customize.title")}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
          aria-label={t("customize.close")}
        >
          <X className="size-4" />
        </Button>
      </div>

      {!compact && (
        <p className="damas3d-customize-sub">{t("customize.subtitle")}</p>
      )}

      <section className="damas3d-customize-section">
        <h3>{t("customize.boardTitle")}</h3>
        <div className="damas3d-theme-grid">
          {BOARD_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={cn(
                "damas3d-theme-card",
                customization.boardThemeId === theme.id &&
                  "damas3d-theme-card-active",
              )}
              onClick={() => setBoardThemeId(theme.id)}
            >
              <div className="damas3d-board-preview">
                <span style={{ background: theme.lightSquare }} />
                <span style={{ background: theme.darkSquare }} />
                <span style={{ background: theme.darkSquare }} />
                <span style={{ background: theme.lightSquare }} />
              </div>
              <span>{t(theme.nameKey)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="damas3d-customize-section">
        <h3>{t("customize.piecesTitle")}</h3>
        <div className="damas3d-theme-grid">
          {PIECE_SETS.map((set) => {
            const resolved = resolvePieceSetTheme(set, boardTheme);
            return (
            <button
              key={set.id}
              type="button"
              className={cn(
                "damas3d-theme-card",
                customization.pieceSetId === set.id &&
                  "damas3d-theme-card-active",
              )}
              onClick={() => setPieceSetId(set.id)}
            >
              <div className="damas3d-piece-preview">
                <span style={piecePreviewDotStyle(resolved.white)} />
                <span style={piecePreviewDotStyle(resolved.black)} />
              </div>
              <span>{t(set.nameKey)}</span>
            </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

export function CustomizePanel({
  open,
  onClose,
  placement = "game",
  compact = false,
  dockStyle,
}: CustomizePanelProps) {
  useEffect(() => {
    if (!open || placement !== "popup") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, placement]);

  if (!open) return null;

  if (placement === "popup") {
    return createPortal(
      <div className="damas3d-customize-modal" role="dialog" aria-modal="true">
        <button
          type="button"
          className="damas3d-customize-backdrop"
          onClick={onClose}
          aria-label="Close"
        />
        <div className="damas3d-customize-popup custom-scrollbar">
          <CustomizePanelContent onClose={onClose} />
        </div>
      </div>,
      document.body,
    );
  }

  if (placement === "dock") {
    return (
      <div
        className="damas3d-customize-dock custom-scrollbar"
        id="damas3d-customize-dock"
        role="region"
        aria-label="Customize"
        style={dockStyle}
      >
        <CustomizePanelContent onClose={onClose} compact={compact} />
      </div>
    );
  }

  return (
    <div className="damas3d-customize-panel custom-scrollbar">
      <CustomizePanelContent onClose={onClose} />
    </div>
  );
}

export function CustomizeToggle({
  onClick,
  active = false,
}: {
  onClick: () => void;
  active?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("damas3d-customize-toggle", active && "damas3d-customize-toggle-active")}
      onClick={onClick}
      aria-expanded={active}
      aria-controls="damas3d-customize-dock"
    >
      <Palette className="size-3.5" />
      <span className="damas3d-btn-label">{t("customize.open")}</span>
    </Button>
  );
}

/** Toggle + painel flutuante abaixo do botão (não desloca o tabuleiro). */
export function CustomizeDock({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [dockStyle, setDockStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setDockStyle({
        top: rect.bottom + 6,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <div className="damas3d-customize-anchor" ref={anchorRef}>
      <CustomizeToggle active={open} onClick={() => onOpenChange(!open)} />
      {open &&
        createPortal(
          <CustomizePanel
            open={open}
            onClose={() => onOpenChange(false)}
            placement="dock"
            compact
            dockStyle={dockStyle}
          />,
          document.body,
        )}
    </div>
  );
}
