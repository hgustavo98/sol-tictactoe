import { MongoClient } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const uri = process.env.MONGODB_URI ?? process.env.DATABASE_URL ?? "";
if (!uri) {
  console.error("Set MONGODB_URI in apps/server/.env");
  process.exit(1);
}

const now = Date.now();
const settings = {
  mock_escrow: "false",
  program_id: "AcNc9UMCBBzuN8Yb54gspKEZ5h6zT1pFZCd4L89mHx2h",
  fee_recipient_wallet: "DgWKL1ToTxKEME1sBeFHXRQpoL9PfTqhTRLPkue2iLLj",
  house_rake_bps: "500",
};

const client = new MongoClient(uri);
await client.connect();
const col = client.db().collection("app_settings");

for (const [key, value] of Object.entries(settings)) {
  await col.updateOne(
    { key },
    { $set: { key, value, updatedAt: now } },
    { upsert: true },
  );
}

console.log("Escrow settings synced to MongoDB");
await client.close();
