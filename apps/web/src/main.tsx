/** Upgrade HTTP → HTTPS on production Vercel hosts. */
if (typeof window !== "undefined") {
  const { hostname, protocol, href } = window.location;
  const isProdHost =
    hostname === "soltactoe.xyz" ||
    hostname === "www.soltactoe.xyz" ||
    hostname === "sol-tictactoe.vercel.app" ||
    hostname === "sol-ttt.vercel.app" ||
    hostname.endsWith(".vercel.app");

  if (protocol === "http:" && isProdHost) {
    window.location.replace(href.replace(/^http:/, "https:"));
  }
}

import { mountApp } from "./bootstrap";

try {
  mountApp();
} catch (err) {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error("[boot]", err);
  const el = document.getElementById("root");
  if (el) {
    el.innerHTML = `<pre style="padding:16px;color:#f87171;white-space:pre-wrap;font:14px/1.5 monospace">${message.replace(/</g, "&lt;")}</pre>`;
  }
}
