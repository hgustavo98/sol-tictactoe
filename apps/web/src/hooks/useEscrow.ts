import type { Wallet } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { SendOptions } from "@solana/web3.js";
import { useCallback } from "react";
import { solToLamports } from "@sol-tictactoe/shared";
import { isSplMint } from "../config/tokens";
import { useEscrowMode } from "../hooks/useEscrowMode";
import { useCluster } from "../hooks/useCluster";
import {
  buildCancelMatchTx,
  buildCreateMatchTx,
  buildFundMatchTx,
  buildJoinMatchTx,
  deriveMatchAccounts,
  sendEscrowTx,
} from "../lib/matchEscrow";

export function useEscrow() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { cluster } = useCluster();
  const { escrowEnabled, programId, missingSteps } = useEscrowMode();

  const requireWallet = useCallback((): Wallet => {
    if (!wallet.publicKey) {
      throw new Error("Carteira não conectada");
    }

    const adapterSign =
      wallet.signTransaction ??
      (wallet.wallet?.adapter &&
      "signTransaction" in wallet.wallet.adapter &&
      typeof wallet.wallet.adapter.signTransaction === "function"
        ? wallet.wallet.adapter.signTransaction.bind(wallet.wallet.adapter)
        : undefined);

    if (!adapterSign) {
      throw new Error("Carteira não suporta assinatura de transações");
    }

    const w = wallet as typeof wallet & {
      publicKey: NonNullable<typeof wallet.publicKey>;
    };
    return {
      publicKey: w.publicKey,
      signTransaction: adapterSign,
      signAllTransactions:
        w.signAllTransactions?.bind(w) ??
        (async (txs) => Promise.all(txs.map((tx) => adapterSign(tx)))),
    } as Wallet;
  }, [wallet]);

  const sendTx = useCallback(
    async (tx: Parameters<typeof sendEscrowTx>[2]) => {
      const w = requireWallet();
      const sendTransaction = wallet.sendTransaction?.bind(wallet);
      return sendEscrowTx(connection, w, tx, {
        cluster,
        sendTransaction: sendTransaction
          ? (transaction, conn, options) =>
              sendTransaction(transaction, conn, options as SendOptions)
          : undefined,
      });
    },
    [connection, wallet, requireWallet, cluster],
  );

  const createMatch = useCallback(
    async (
      betSol: number,
      tokenMint?: string,
      matchId?: string,
      rakeBps = 300,
    ) => {
      const w = requireWallet();
      const id = matchId ?? crypto.randomUUID();
      const betLamports = solToLamports(betSol);

      if (betLamports === 0) {
        return {
          signature: "",
          matchPda: id,
          betLamports,
        };
      }

      if (tokenMint && isSplMint(tokenMint)) {
        throw new Error("SPL escrow ainda não disponível nesta versão");
      }

      if (!escrowEnabled) {
        const steps = missingSteps.length
          ? ` Passos: ${missingSteps.join("; ")}`
          : "";
        throw new Error(
          `Escrow on-chain não configurado.${steps}`,
        );
      }

      const { tx, matchPda } = await buildCreateMatchTx(connection, w, {
        matchId: id,
        betLamports,
        rakeBps,
        programId,
      });
      const signature = await sendTx(tx);
      return { signature, matchPda, betLamports };
    },
    [requireWallet, escrowEnabled, programId, missingSteps, sendTx],
  );

  const joinMatch = useCallback(
    async (
      _matchPdaHint: string,
      betLamports: number,
      tokenMint?: string,
      matchId?: string,
    ) => {
      const w = requireWallet();

      if (betLamports === 0) {
        return { signature: "", matchPda: matchId ?? "" };
      }

      if (tokenMint && isSplMint(tokenMint)) {
        throw new Error("SPL escrow ainda não disponível nesta versão");
      }

      if (!escrowEnabled) {
        const steps = missingSteps.length
          ? ` Passos: ${missingSteps.join("; ")}`
          : "";
        throw new Error(
          `Escrow on-chain não configurado.${steps}`,
        );
      }

      if (!matchId) {
        throw new Error("matchId é obrigatório para join on-chain");
      }

      const { tx, matchPda } = await buildJoinMatchTx(connection, w, {
        matchId,
        expectedBetLamports: betLamports,
        programId,
        cluster,
      });
      const signature = await sendTx(tx);
      return { signature, matchPda };
    },
    [requireWallet, escrowEnabled, programId, missingSteps, sendTx],
  );

  const fundMatch = useCallback(
    async (matchPda: string, betLamports: number, matchId: string) => {
      const w = requireWallet();

      if (betLamports === 0) {
        return { signature: "" };
      }

      if (!escrowEnabled) {
        throw new Error("Escrow on-chain não configurado.");
      }

      const tx = await buildFundMatchTx(connection, w, {
        matchPda,
        matchId,
        programId,
      });
      const signature = await sendTx(tx);
      return { signature };
    },
    [requireWallet, escrowEnabled, programId, sendTx],
  );

  const cancelMatch = useCallback(
    async (matchPda: string, matchId: string) => {
      const w = requireWallet();
      if (!escrowEnabled) return { signature: "" };
      const tx = await buildCancelMatchTx(connection, w, {
        matchPda,
        matchId,
        programId,
      });
      const signature = await sendTx(tx);
      return { signature };
    },
    [requireWallet, escrowEnabled, programId, sendTx],
  );

  const previewMatchPda = useCallback(
    (matchId: string) => {
      const { matchAccount } = deriveMatchAccounts(matchId, programId);
      return matchAccount.toBase58();
    },
    [programId],
  );

  return {
    createMatch,
    joinMatch,
    fundMatch,
    cancelMatch,
    previewMatchPda,
    escrowEnabled,
  };
}
