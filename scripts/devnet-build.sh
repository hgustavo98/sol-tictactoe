#!/usr/bin/env bash
set -euo pipefail

export HOME=/root
SOLANA_BIN="/root/.local/share/solana/install/releases/stable-549805f3e85f345c9df98d59759691443eef57aa/solana-release/bin"
export PATH="${SOLANA_BIN}:/root/.cargo/bin:/usr/bin:/bin"

PROJECT="/root/solana-chess"
WIN="/mnt/c/Users/Gusta/Projects/solana-chess"
cd "$PROJECT"

rustup override set stable-x86_64-unknown-linux-gnu
rm -f Cargo.lock
cargo generate-lockfile

cargo update -p blake3 --precise 1.8.2
cargo update -p constant_time_eq --precise 0.3.1
cargo update proc-macro-crate@3.5.0 --precise 3.2.0
cargo update -p zeroize_derive --precise 1.4.2
cargo update -p cc --precise 1.1.37
cargo update jobserver@0.1.34 --precise 0.1.32
cargo update -p indexmap --precise 2.11.4
cargo update borsh@1.7.0 --precise 1.5.1
cargo update -p unicode-segmentation --precise 1.10.1

if grep -q '^version = 4' Cargo.lock; then
  sed -i 's/^version = 4/version = 3/' Cargo.lock
fi

cp Cargo.lock "$WIN/Cargo.lock"

rustup override set 1.79.0-x86_64-unknown-linux-gnu
# DevNet requires SBPF v3 (SIMD-0500); use Solana 4.x cargo-build-sbf, not anchor build.
cargo-build-sbf --arch v3 --manifest-path programs/match-escrow/Cargo.toml 2>&1 | tee /tmp/anchor-build.log

echo "BUILD_OK"
solana address -k target/deploy/match_escrow-keypair.json
ls -la target/deploy/
