#!/usr/bin/env bash
set -euo pipefail

export HOME=/root
SOLANA_BIN="/root/.local/share/solana/install/releases/stable-549805f3e85f345c9df98d59759691443eef57aa/solana-release/bin"
export PATH="${SOLANA_BIN}:/root/.cargo/bin:/usr/bin:/bin"

PROJECT="/root/solana-chess"
WIN="/mnt/c/Users/Gusta/Projects/solana-chess"
FEE_RECIPIENT="DgWKL1ToTxKEME1sBeFHXRQpoL9PfTqhTRLPkue2iLLj"
PROGRAM_ID="AcNc9UMCBBzuN8Yb54gspKEZ5h6zT1pFZCd4L89mHx2h"

mkdir -p /root/.config/solana
solana config set --url devnet

echo "Deploy wallet: $(solana address)"
echo "Balance: $(solana balance || echo 0)"

# Close orphan buffers from failed deploys
while read -r buf _; do
  if [[ "$buf" =~ ^[1-9A-HJ-NP-Za-km-z]{32,44}$ ]]; then
    echo "Closing buffer $buf"
    solana program close "$buf" --url devnet --keypair /root/.config/solana/id.json || true
  fi
done < <(solana program show --buffers --url devnet 2>/dev/null | tail -n +2)

cd "$PROJECT"
if [[ ! -f target/deploy/match_escrow.so ]]; then
  bash "$WIN/scripts/devnet-build.sh"
fi

solana program deploy target/deploy/match_escrow.so \
  --program-id target/deploy/match_escrow-keypair.json \
  --url devnet \
  --keypair /root/.config/solana/id.json

echo "DEPLOY_OK program=$PROGRAM_ID"
