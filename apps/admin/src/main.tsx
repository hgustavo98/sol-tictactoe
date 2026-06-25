function showBootError(err: unknown): void {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error("[boot]", err);
  const el = document.getElementById("root");
  if (el) {
    el.innerHTML = `<pre style="padding:16px;color:#f87171;white-space:pre-wrap;font:14px/1.5 monospace">${message.replace(/</g, "&lt;")}</pre>`;
  }
}

void import("./bootstrap")
  .then(({ mountAdminApp }) => mountAdminApp())
  .catch(showBootError);
