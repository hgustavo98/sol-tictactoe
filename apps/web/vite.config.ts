import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const solanaErrorsPath = path.resolve(
  __dirname,
  "../../node_modules/@solana/kit/node_modules/@solana/errors",
);
const reactPath = path.resolve(__dirname, "../../node_modules/react");
const reactDomPath = path.resolve(__dirname, "../../node_modules/react-dom");

const devProxyTarget =
  process.env.VITE_DEV_PROXY_TARGET?.trim() || "http://127.0.0.1:3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: reactPath,
      "react-dom": reactDomPath,
      buffer: "buffer",
      "@solana/errors": solanaErrorsPath,
      "@": path.resolve(__dirname, "./src"),
      "@sol-tictactoe/shared": path.resolve(
        __dirname,
        "../../packages/shared/src/index.ts",
      ),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: devProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/config": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/auth": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/analytics": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/socket.io": {
        target: devProxyTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
