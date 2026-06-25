import { Connection, PublicKey } from "@solana/web3.js";

const PROGRAM_ID = "AcNc9UMCBBzuN8Yb54gspKEZ5h6zT1pFZCd4L89mHx2h";
const GLOBAL_CONFIG = "6Qd2HitwYddkDHpQrwwj1ZCRjBXoy9MaENSsk69Cwh6J";
const TARGET = "DgWKL1ToTxKEME1sBeFHXRQpoL9PfTqhTRLPkue2iLLj";

const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const info = await conn.getAccountInfo(new PublicKey(GLOBAL_CONFIG));
if (!info) {
  console.log("GlobalConfig not found");
  process.exit(1);
}
const data = info.data;
const authority = new PublicKey(data.subarray(8, 40));
const rakeBps = data.readUInt16LE(40);
const feeRecipient = new PublicKey(data.subarray(42, 74));
const treasury = new PublicKey(data.subarray(74, 106));

console.log("authority:", authority.toBase58());
console.log("fee_recipient ON-CHAIN:", feeRecipient.toBase58());
console.log("house_treasury:", treasury.toBase58());
console.log("house_rake_bps:", rakeBps);
console.log("target wallet:", TARGET);
console.log("on-chain matches target:", feeRecipient.toBase58() === TARGET);

for (const label of ["fee_recipient", "authority", "treasury", "target"]) {
  const pk =
    label === "fee_recipient"
      ? feeRecipient
      : label === "authority"
        ? authority
        : label === "treasury"
          ? treasury
          : new PublicKey(TARGET);
  const bal = await conn.getBalance(pk);
  console.log(`${label} balance: ${(bal / 1e9).toFixed(9)} SOL`);
}
