import { Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { PieceColor } from "../types";

interface PlayerColorBadgeProps {
  color: PieceColor;
  className?: string;
}

export function PlayerColorBadge({ color, className }: PlayerColorBadgeProps) {
  const { t } = useTranslation();
  const isWhite = color === "w";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
        "border-white/15 bg-[rgba(10,22,40,0.88)] backdrop-blur-sm",
        "font-game text-[0.68rem] font-bold tracking-wide text-white/90",
        className,
      )}
      aria-label={t(isWhite ? "damas3d.youWhite" : "damas3d.youBlack")}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md border",
          isWhite
            ? "border-amber-200/40 bg-linear-to-b from-[#fde68a] to-[#d97706] text-[#422006]"
            : "border-slate-500/40 bg-linear-to-b from-[#475569] to-[#0f172a] text-slate-200",
        )}
      >
        <Crown className="size-3.5" strokeWidth={2.5} aria-hidden />
      </span>
      <span>{t(isWhite ? "damas3d.youWhite" : "damas3d.youBlack")}</span>
    </div>
  );
}
