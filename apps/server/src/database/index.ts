import { config } from "../config";
import { MongoStore } from "./mongo-store";
import type { DataStore } from "./types";

let store: DataStore | null = null;

export async function connectDatabase(): Promise<DataStore> {
  if (store) return store;

  const mongoUri = config.mongodbUri.trim();
  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI (or DATABASE_URL) is required — SQLite is no longer supported",
    );
  }

  const mongo = new MongoStore(mongoUri);
  await mongo.connect();
  store = mongo;
  console.log("[db] Connected to MongoDB");

  return store;
}

export function getStore(): DataStore {
  if (!store) {
    throw new Error("Database not connected. Call connectDatabase() first.");
  }
  return store;
}

export function getDatabaseProvider(): string {
  return store?.provider ?? "none";
}

export async function closeDatabase(): Promise<void> {
  await store?.close();
  store = null;
}

export type { DataStore, BankLedgerEntry, BankLedgerType } from "./types";
export { createBankEntry } from "./bank-ledger";
