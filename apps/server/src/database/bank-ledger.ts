import { randomUUID } from "crypto";
import type { BankLedgerEntry } from "./types";

export function createBankEntry(
  input: Omit<BankLedgerEntry, "id" | "createdAt">,
): BankLedgerEntry {
  return {
    ...input,
    id: randomUUID(),
    createdAt: Date.now(),
  };
}
