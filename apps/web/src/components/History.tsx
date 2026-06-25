import { useEffect, useState } from "react";
import { lamportsToSol, type MatchReceipt } from "@sol-tictactoe/shared";
import { EXPLORER_TX } from "../config/tokens";
import { getApiBase } from "../config/apiBase";
import { loadPlayerSession } from "../hooks/playerAuthStorage";
import { useGuestId } from "../hooks/useGuestId";
import { usePlayerAuth } from "../hooks/usePlayerAuth";

export function History() {
  const [receipts, setReceipts] = useState<MatchReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const guestId = useGuestId();
  const { isAuthenticated } = usePlayerAuth(guestId);

  useEffect(() => {
    const session = loadPlayerSession();
    if (!session?.token || session.expiresAt <= Date.now()) {
      setReceipts([]);
      setLoading(false);
      return;
    }

    fetch(`${getApiBase()}/api/receipts/mine`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`receipts ${r.status}`);
        return r.json();
      })
      .then(setReceipts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (loading) {
    return <p className="text-[var(--sc-muted)]">Carregando histórico…</p>;
  }

  if (!isAuthenticated) {
    return (
      <p className="text-[var(--sc-muted)]">
        Conecte a carteira e inicie sessão para ver o seu histórico.
      </p>
    );
  }

  if (receipts.length === 0) {
    return (
      <p className="text-[var(--sc-muted)]">
        Nenhuma partida finalizada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Partidas recentes</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--sc-muted)] border-b border-[var(--sc-border)]">
              <th className="py-2 pr-4">Data</th>
              <th className="py-2 pr-4">Aposta</th>
              <th className="py-2 pr-4">Pote</th>
              <th className="py-2 pr-4">Rake</th>
              <th className="py-2 pr-4">Vencedor</th>
              <th className="py-2">Tx</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr
                key={r.matchId}
                className="border-b border-[var(--sc-border)]/50"
              >
                <td className="py-3 pr-4">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="py-3 pr-4 font-mono">
                  {lamportsToSol(r.betLamports).toFixed(4)}
                </td>
                <td className="py-3 pr-4 font-mono">
                  {lamportsToSol(r.potLamports).toFixed(4)}
                </td>
                <td className="py-3 pr-4 font-mono text-amber-400">
                  {lamportsToSol(r.rakeLamports).toFixed(4)}
                </td>
                <td className="py-3 pr-4 font-mono text-xs">
                  {r.winner
                    ? `${r.winner.slice(0, 4)}…${r.winner.slice(-4)}`
                    : "Empate"}
                </td>
                <td className="py-3">
                  {r.settleSignature && (
                    <a
                      href={EXPLORER_TX(r.settleSignature)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--sc-accent)] hover:underline"
                    >
                      Explorer
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
