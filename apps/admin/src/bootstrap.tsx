import { Buffer } from "buffer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "@/admin/AdminApp";
import { SolanaProvider } from "@/components/SolanaProvider";
import { WalletModalProvider } from "@/components/wallet/WalletModalContext";
import "@/i18n";
import "@/index.css";

if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

export function mountAdminApp(): void {
  const el = document.getElementById("root");
  if (!el) throw new Error("Missing #root element");
  createRoot(el).render(
    <StrictMode>
      <SolanaProvider autoConnect={false} localStorageKey="sol-ttt-admin-wallet">
        <WalletModalProvider>
          <AdminApp />
        </WalletModalProvider>
      </SolanaProvider>
    </StrictMode>,
  );
}
