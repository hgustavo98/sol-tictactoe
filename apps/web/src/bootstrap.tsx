import { Buffer } from "buffer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { App } from "./App";
import { SolanaProvider } from "./components/SolanaProvider";
import { WalletModalProvider } from "./components/wallet/WalletModalContext";
import { DamasCustomizationProvider } from "./damas3d/hooks/useDamasCustomization";
import { Toaster } from "./components/ui/sonner";
import "./i18n";
import "./index.css";
import "./ttt2d/ttt.css";

if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

export function mountApp(): void {
  const el = document.getElementById("root");
  if (!el) throw new Error("Missing #root element");
  createRoot(el).render(
    <StrictMode>
      <SolanaProvider>
        <WalletModalProvider>
          <DamasCustomizationProvider>
            <App />
            <Toaster />
            {import.meta.env.PROD && (
              <>
                <Analytics />
                <SpeedInsights />
              </>
            )}
          </DamasCustomizationProvider>
        </WalletModalProvider>
      </SolanaProvider>
    </StrictMode>,
  );
}
