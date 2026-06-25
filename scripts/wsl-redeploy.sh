#!/usr/bin/env bash
set -euo pipefail

WIN="/mnt/c/Users/Gusta/Projects/solana-chess"
PROJECT="/root/solana-chess"

mkdir -p "$PROJECT/programs"
rsync -a "$WIN/programs/" "$PROJECT/programs/"
[[ -f "$WIN/Cargo.toml" ]] && rsync -a "$WIN/Cargo.toml" "$PROJECT/"
[[ -f "$WIN/Anchor.toml" ]] && rsync -a "$WIN/Anchor.toml" "$PROJECT/"

bash "$WIN/scripts/devnet-build.sh"
bash "$WIN/scripts/devnet-deploy.sh"

# npm is not available in WSL — init escrow from Windows Node
powershell.exe -NoProfile -Command "
  Set-Location 'C:\\Users\\Gusta\\Projects\\solana-chess\\apps\\server';
  \$env:FEE_RECIPIENT_WALLET='DgWKL1ToTxKEME1sBeFHXRQpoL9PfTqhTRLPkue2iLLj';
  \$env:PROGRAM_ID='AcNc9UMCBBzuN8Yb54gspKEZ5h6zT1pFZCd4L89mHx2h';
  \$env:RPC_URL='https://api.devnet.solana.com';
  \$env:AUTHORITY_KEYPAIR_PATH='C:\\Users\\Gusta\\Projects\\solana-chess\\apps\\server\\authority.json';
  \$env:HOUSE_RAKE_BPS='500';
  npm run init-escrow
"

echo "REDEPLOY_OK"
