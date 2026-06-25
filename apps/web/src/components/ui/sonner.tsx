import "sonner/dist/styles.css";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      closeButton
      richColors
      expand
      visibleToasts={4}
      className="app-game-toaster"
      toastOptions={{
        classNames: {
          toast:
            "group toast app-toast border border-white/10 bg-[#1a0808]/95 text-white shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md",
          title: "font-game text-sm font-semibold tracking-wide text-white",
          description: "font-game text-xs text-white/70",
          actionButton:
            "bg-[#ff6b35] text-[#1a0808] font-semibold hover:bg-[#ff8c42]",
          cancelButton: "bg-white/10 text-white hover:bg-white/15",
          closeButton:
            "border-white/15 bg-[#2a0a0a] text-white/80 hover:bg-[#3d1515] hover:text-white",
          success: "app-toast-success border-orange-500/30",
          error: "app-toast-error border-red-500/35",
          info: "app-toast-info border-[#ff6b35]/30",
          warning: "app-toast-warning border-amber-500/30",
        },
      }}
      {...props}
    />
  );
}
