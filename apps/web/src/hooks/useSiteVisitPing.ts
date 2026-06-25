import { useEffect } from "react";
import { getApiBase } from "../config/apiBase";

const VISITOR_KEY = "sol-ttt-visitor-id";

function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function useSiteVisitPing(): void {
  useEffect(() => {
    const ping = () => {
      void fetch(`${getApiBase()}/api/analytics/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: getVisitorId() }),
      }).catch(() => undefined);
    };

    ping();
    const interval = window.setInterval(ping, 120_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
