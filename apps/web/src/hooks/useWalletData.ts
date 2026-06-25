import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import type { AppConfig } from "@sol-tictactoe/shared";
import { getApiBase } from "../config/apiBase";

async function fetchConfigFrom(url: string): Promise<AppConfig> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Config request failed (${res.status})`);
  }
  return res.json() as Promise<AppConfig>;
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);

    const api = getApiBase();
    const candidates = [
      `${api}/api/config`,
      api ? `${api}/config` : null,
      "/api/config",
    ].filter((url, index, list): url is string => Boolean(url) && list.indexOf(url) === index);

    return (async () => {
      let lastError: unknown;
      for (const url of candidates) {
        try {
          const next = await fetchConfigFrom(url);
          setConfig(next);
          setError(null);
          return;
        } catch (err) {
          lastError = err;
        }
      }
      console.error("[useAppConfig] failed to load config", lastError);
      setConfig(null);
      setError(
        lastError instanceof Error
          ? lastError.message
          : "Failed to load server config",
      );
    })().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener("sol-ttt-config-refresh", onRefresh);
    return () => window.removeEventListener("sol-ttt-config-refresh", onRefresh);
  }, [refresh]);

  return { config, loading, error, refresh };
}

export function useSolBalance() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    setLoading(true);
    try {
      const lamports = await connection.getBalance(publicKey, "confirmed");
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("[useSolBalance] failed to fetch balance", error);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, connected]);

  useEffect(() => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    const syncBalance = async () => {
      try {
        const lamports = await connection.getBalance(publicKey, "confirmed");
        if (!cancelled) {
          setBalance(lamports / LAMPORTS_PER_SOL);
        }
      } catch (error) {
        console.error("[useSolBalance] failed to fetch balance", error);
        if (!cancelled) setBalance(null);
      }
    };

    void syncBalance();

    const subscriptionId = connection.onAccountChange(
      publicKey,
      (account) => {
        if (!cancelled) {
          setBalance(account.lamports / LAMPORTS_PER_SOL);
        }
      },
      "confirmed",
    );

    const intervalId = window.setInterval(() => {
      void syncBalance();
    }, 12_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      void connection.removeAccountChangeListener(subscriptionId);
    };
  }, [connection, publicKey, connected]);

  return { balance, loading, refresh };
}

export function useSolPrice() {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
    )
      .then((r) => r.json())
      .then((d) => setPrice(d.solana?.usd ?? null))
      .catch(() => setPrice(null));
  }, []);

  return price;
}
