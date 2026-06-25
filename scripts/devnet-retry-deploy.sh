#!/usr/bin/env bash
set -euo pipefail

export HOME=/root
SOLANA_BIN="/root/.local/share/solana/install/releases/stable-549805f3e85f345c9df98d59759691443eef57aa/solana-release/bin"
export PATH="${SOLANA_BIN}:/root/.cargo/bin:/usr/bin:/bin"

PROJECT="/root/solana-chess"
WIN="/mnt/c/Users/Gusta/Projects/solana-chess"
KEYPAIR="/root/.config/solana/id.json"

solana config set --url devnet
echo "Deploy wallet: $(solana address -k "$KEYPAIR")"
echo "Balance: $(solana balance -k "$KEYPAIR")"

while read -r buf _; do
  if [[ "$buf" =~ ^[1-9A-HJ-NP-Za-km-z]{32,44}$ ]]; then
    echo "Closing buffer $buf"
    solana program close "$buf" --url devnet --keypair "$KEYPAIR" || true
  fi
done < <(solana program show --buffers --url devnet 2>/dev/null | tail -n +2)

echo "Balance after buffer cleanup: $(solana balance -k "$KEYPAIR")"

cd "$PROJECT"
solana program deploy target/deploy/match_escrow.so \
  --program-id target/deploy/match_escrow-keypair.json \
  --url devnet \
  --keypair "$KEYPAIR" \
  --max-sign-attempts 50

echo "DEPLOY_OK"

export FEE_RECIPIENT_WALLET="DgWKL1ToTxKEME1sBeFHXRQpoL9PfTqhTRLPkue2iLLj"
export PROGRAM_ID="AcNc9UMCBBzuN8Yb54gspKEZ5h6zT1pFZCd4L89mHx2h"
export RPC_URL="https://api.devnet.solana.com"
export AUTHORITY_KEYPAIR_PATH="$WIN/apps/server/authority.json"
export HOUSE_RAKE_BPS=500

cd "$WIN/apps/server"
npm run init-escrow

echo "INIT_OK"
