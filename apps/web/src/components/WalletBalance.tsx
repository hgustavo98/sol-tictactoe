import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";

export function WalletBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    void connection
      .getBalance(publicKey)
      .then((b) => setBalance(b / LAMPORTS_PER_SOL));
  }, [connection, publicKey]);

  if (balance === null) return null;

  return (
    <span className="hidden text-sm text-[var(--text-muted)] sm:block">
      {balance.toFixed(4)} SOL
    </span>
  );
}
