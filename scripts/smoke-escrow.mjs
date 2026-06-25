/**
 * Verify escrow readiness via server /config (or /health + /config).
 *
 * Usage:
 *   node scripts/smoke-escrow.mjs
 *   API_URL=http://127.0.0.1:3000 node scripts/smoke-escrow.mjs
 *   API_URL=https://api.sol-ttt.xyz SMOKE_PROFILE=mainnet node scripts/smoke-escrow.mjs
 */
const apiBase = (process.env.API_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const profile = (process.env.SMOKE_PROFILE ?? "default").toLowerCase();
const expectMainnet =
  profile === "mainnet" || process.env.SMOKE_EXPECT_MAINNET === "1";

const SENSITIVE_RPC_PATTERNS = [
  /api[-_]?key=/i,
  /[?&]token=/i,
  /helius-rpc\.com/i,
  /quiknode\.pro/i,
];

function rpcLooksSanitized(url) {
  if (!url || typeof url !== "string") return false;
  return !SENSITIVE_RPC_PATTERNS.some((re) => re.test(url));
}

async function main() {
  const health = await fetch(`${apiBase}/health`);
  if (!health.ok) throw new Error(`Health failed: ${health.status}`);

  const configRes = await fetch(`${apiBase}/api/config`, { cache: "no-store" });
  if (!configRes.ok) throw new Error(`Config failed: ${configRes.status}`);
  const config = await configRes.json();

  console.log("[smoke] profile:", profile);
  console.log("[smoke] cluster:", config.solanaCluster);
  console.log("[smoke] clusterLocked:", config.clusterLocked);
  console.log("[smoke] mockEscrow:", config.mockEscrow);
  console.log("[smoke] programId:", config.programId);
  console.log("[smoke] houseRakeBps:", config.houseRakeBps);
  console.log("[smoke] escrowReady:", config.escrowReady);
  console.log("[smoke] rpcUrl (client):", config.rpcUrl ?? "(missing)");

  const d = config.escrowDiagnostics;
  if (!d) throw new Error("Missing escrowDiagnostics");

  const checks = [
    ["mockEscrowOff", d.mockEscrowOff],
    ["feeRecipientSet", d.feeRecipientSet],
    ["programDeployed", d.programDeployed],
    ["globalConfigInitialized", d.globalConfigInitialized],
    ["authorityFunded", d.authorityFunded],
    ["rpcReachable", d.rpcReachable],
    ["clientRpcSanitized", rpcLooksSanitized(config.rpcUrl)],
  ];

  if (expectMainnet) {
    checks.push(
      ["mainnetCluster", config.solanaCluster === "mainnet-beta"],
      ["clusterLocked", config.clusterLocked === true],
    );
    if (typeof d.authorityBalanceLamports === "number") {
      const minAuthorityLamports = 50_000_000; // 0.05 SOL
      checks.push([
        "authorityMinBalance",
        d.authorityBalanceLamports >= minAuthorityLamports,
      ]);
      console.log(
        "[smoke] authorityBalance:",
        (d.authorityBalanceLamports / 1e9).toFixed(4),
        "SOL",
      );
    }
  }

  let failed = false;
  for (const [name, ok] of checks) {
    console.log(`[smoke] ${name}: ${ok ? "OK" : "FAIL"}`);
    if (!ok) failed = true;
  }

  if (d.missingSteps?.length) {
    console.log("[smoke] missingSteps:");
    for (const step of d.missingSteps) console.log(`  - ${step}`);
  }

  if (failed || config.mockEscrow) {
    process.exit(1);
  }

  if (expectMainnet) {
    console.log("[smoke] Mainnet escrow ready — run a ranked 0.1 SOL match E2E next.");
  } else {
    console.log("[smoke] Escrow ready for paid matches.");
  }
}

main().catch((err) => {
  console.error("[smoke]", err.message ?? err);
  process.exit(1);
});
