import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

const webSrc = path.resolve(__dirname, "../web/src");

function readEnvValue(filePath: string, key: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() !== key) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }
  return undefined;
}

/** Um único GOOGLE_CLIENT_ID no server/.env alimenta o admin em dev. */
const googleClientId =
  process.env.VITE_GOOGLE_CLIENT_ID?.trim() ||
  readEnvValue(path.resolve(__dirname, ".env"), "VITE_GOOGLE_CLIENT_ID") ||
  process.env.GOOGLE_CLIENT_ID?.trim() ||
  readEnvValue(path.resolve(__dirname, "../server/.env"), "GOOGLE_CLIENT_ID");

if (googleClientId) {
  process.env.VITE_GOOGLE_CLIENT_ID = googleClientId;
}

const solanaErrorsPath = path.resolve(
  __dirname,
  "../../node_modules/@solana/kit/node_modules/@solana/errors",
);
const reactPath = path.resolve(__dirname, "../../node_modules/react");
const reactDomPath = path.resolve(__dirname, "../../node_modules/react-dom");

export default defineConfig({
  base: process.env.VITE_ADMIN_BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: reactPath,
      "react-dom": reactDomPath,
      buffer: "buffer",
      "@solana/errors": solanaErrorsPath,
      "@": webSrc,
      "@sol-tictactoe/shared": path.resolve(
        __dirname,
        "../../packages/shared/src/index.ts",
      ),
    },
  },
  server: {
    host: "localhost",
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
