import {
  computeBetBreakdown,
  lamportsToSol,
} from "@sol-tictactoe/shared";

interface BetPreviewProps {
  betLamports: number;
  houseRakeBps: number;
  tokenSymbol?: string;
  solPriceUsd?: number | null;
}

export function BetPreview({
  betLamports,
  houseRakeBps,
  tokenSymbol = "SOL",
  solPriceUsd,
}: BetPreviewProps) {
  const breakdown = computeBetBreakdown(betLamports, houseRakeBps);
  const betSol = lamportsToSol(betLamports);
  const usd =
    solPriceUsd != null && tokenSymbol === "SOL"
      ? `≈ $${(betSol * solPriceUsd).toFixed(2)}`
      : null;

  return (
    <div className="rounded-lg border border-[var(--sc-border)] bg-[var(--sc-surface)] p-4 text-sm">
      <h3 className="mb-3 font-semibold text-[var(--sc-accent2)]">
        Preview da aposta
      </h3>
      <div className="space-y-2 text-gray-300">
        <div className="flex justify-between">
          <span>Aposta</span>
          <span className="font-mono">
            {betSol.toFixed(4)} {tokenSymbol}
            {usd && <span className="ml-2 text-[var(--sc-muted)]">{usd}</span>}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Pote total</span>
          <span className="font-mono text-[var(--sc-accent2)]">
            {lamportsToSol(breakdown.potLamports).toFixed(4)} {tokenSymbol}
          </span>
        </div>
        <div className="flex justify-between text-amber-400">
          <span>Rake ({breakdown.rakePercent}%)</span>
          <span className="font-mono">
            {lamportsToSol(breakdown.rakeLamports).toFixed(4)} {tokenSymbol}
          </span>
        </div>
        <div className="flex justify-between border-t border-[var(--sc-border)] pt-2 font-semibold text-[var(--sc-accent2)]">
          <span>Você ganha até</span>
          <span className="font-mono">
            {lamportsToSol(breakdown.maxPayoutLamports).toFixed(4)} {tokenSymbol}
          </span>
        </div>
        <p className="text-xs text-[var(--sc-muted)]">
          Perdedor recebe 0. Empate = reembolso 50/50 sem rake.
        </p>
      </div>
    </div>
  );
}
