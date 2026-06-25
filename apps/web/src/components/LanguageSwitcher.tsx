import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n";

export function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "xtt" }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentCode = i18n.language.split("-")[0] as LanguageCode;
  const currentLabel =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === currentCode)?.label ??
    currentCode;

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          variant === "xtt"
            ? "xtt-lang-btn"
            : [
                "inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-500/25",
                "bg-[rgba(42,16,16,0.92)] px-2.5 font-game text-xs font-semibold text-white/90",
                "transition-colors duration-150 hover:border-red-400/45",
                "hover:bg-[rgba(61,21,21,0.95)]",
              ],
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("language.label")}
      >
        <Globe
          className={cn(
            "size-3.5 shrink-0",
            variant === "xtt" ? "text-[#33cfff]" : "text-red-400",
          )}
          strokeWidth={2}
          aria-hidden
        />
        <span className="language-switcher-label max-w-[5.75rem] truncate">
          {currentLabel}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-white/50 transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("language.label")}
          className={cn(
            "absolute right-0 top-[calc(100%+0.35rem)] z-[60] min-w-[10.5rem]",
            "overflow-hidden rounded-lg border py-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            variant === "xtt"
              ? "border-[rgba(124,58,237,0.35)] bg-[#0c1024]"
              : "border-white/12 bg-[#1a0808]",
          )}
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const selected = lang.code === currentCode;
            return (
              <li key={lang.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    void i18n.changeLanguage(lang.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2",
                    "text-left text-xs font-medium transition-colors duration-100",
                    selected
                      ? variant === "xtt"
                        ? "bg-[rgba(0,180,255,0.12)] text-[#33cfff]"
                        : "bg-red-500/15 text-red-200"
                      : "text-white/90 hover:bg-white/8",
                  )}
                >
                  <span>{lang.label}</span>
                  {selected && (
                    <Check
                      className={cn(
                        "size-3.5 shrink-0",
                        variant === "xtt" ? "text-[#33cfff]" : "text-red-400",
                      )}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
