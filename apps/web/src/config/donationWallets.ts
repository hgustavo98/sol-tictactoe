export const DEV_DONATION_WALLETS = {
  solana: "EWrRr22zah7hq1quUqhuo7HGC4Q6dyysm6YfWUiucK25",
  ethereum: "0xE23aFD5ba4ed7C6d3c7E100c36a4570d4F60a31B",
  bitcoin: "bc1qxt6jycztt8pgmr6g0rh4z0p4wzml08j3k4hj5e",
} as const;

export type DonationChain = keyof typeof DEV_DONATION_WALLETS;
