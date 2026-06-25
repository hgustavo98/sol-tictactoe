import crypto from "crypto";
import type { GameState } from "@sol-tictactoe/shared";
import { lamportsToSol, shortenAddress } from "@sol-tictactoe/shared";
import { logMatchEvent } from "./db";

export interface ReceiptMetadata {
  name: string;
  symbol: string;
  description: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
  properties: Record<string, unknown>;
}

export function buildGameReceiptMetadata(
  matchId: string,
  state: GameState,
  pgn: string,
  settleSignature?: string,
): ReceiptMetadata {
  return {
    name: `SOL Tic Tac Toe #${matchId.slice(0, 8)}`,
    symbol: "STTT",
    description: "Tokenized receipt for a completed SOL Tic Tac Toe wagered match.",
    attributes: [
      { trait_type: "Player White", value: shortenAddress(state.playerWhite) },
      { trait_type: "Player Black", value: shortenAddress(state.playerBlack) },
      {
        trait_type: "Winner",
        value: state.winner ? shortenAddress(state.winner) : "Draw",
      },
      { trait_type: "Bet (SOL)", value: lamportsToSol(state.betLamports) },
      { trait_type: "Pot (SOL)", value: lamportsToSol(state.potLamports) },
      {
        trait_type: "End Reason",
        value: state.endReason ?? "unknown",
      },
      { trait_type: "Moves", value: state.moves.length },
    ],
    properties: {
      category: "game-receipt",
      match_id: matchId,
      pgn,
      settle_tx: settleSignature ?? null,
      receipt_hash: crypto
        .createHash("sha256")
        .update(JSON.stringify({ matchId, pgn, settleSignature }))
        .digest("hex"),
    },
  };
}

export function persistGameReceipt(
  matchId: string,
  state: GameState,
  pgn: string,
  settleSignature?: string,
): string {
  const metadata = buildGameReceiptMetadata(
    matchId,
    state,
    pgn,
    settleSignature,
  );
  const metadataUri = `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;
  logMatchEvent(matchId, "game_receipt", { metadataUri, metadata });
  return metadata.properties.receipt_hash as string;
}
