import { NextResponse } from "next/server";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SCAV_DECIMALS, SCAV_MINT, getConnection, getHuntPoolKeypair } from "@/lib/solana";

// Proxy.ts gates every /api/admin/* route behind ADMIN_PASSWORD (Basic Auth).
//
// Read-only pre-launch check: reports which wallet and which network THIS
// deployment will pay claims from. It returns public values only (a public
// key, a hostname, balances). It never returns a key, a full RPC URL, or
// anything else secret, and it never sends a transaction.

export const dynamic = "force-dynamic";

const EXPECTED_HUNT_POOL = "EEzmuZvUHrQqnAB2zZg8gByMfyyCgiSX24gXURkeLnV9";
const MAINNET_GENESIS_HASH = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const LOW_SOL_WARNING = 0.05;

export async function GET() {
  const report: Record<string, unknown> = { checkedAt: new Date().toISOString() };

  try {
    const huntPool = getHuntPoolKeypair().publicKey;
    report.huntPoolPublicKey = huntPool.toBase58();
    report.huntPoolMatchesExpected = huntPool.toBase58() === EXPECTED_HUNT_POOL;

    const connection = getConnection();
    // Hostname only: the full URL carries the provider API key.
    report.payoutRpcHost = new URL(connection.rpcEndpoint).host;
    report.payoutRpcIsHelius = report.payoutRpcHost === "mainnet.helius-rpc.com";
    report.cluster = (await connection.getGenesisHash()) === MAINNET_GENESIS_HASH ? "mainnet-beta" : "NOT MAINNET";

    report.scavMint = SCAV_MINT.toBase58();
    report.scavDecimalsInCode = SCAV_DECIMALS;

    const sol = (await connection.getBalance(huntPool)) / 1e9;
    report.huntPoolSol = sol;
    report.huntPoolSolLow = sol < LOW_SOL_WARNING;

    const ata = getAssociatedTokenAddressSync(SCAV_MINT, huntPool);
    const scav = await connection.getTokenAccountBalance(ata);
    report.huntPoolScav = scav.value.uiAmountString;
    report.scavDecimalsOnChain = scav.value.decimals;

    report.ok =
      report.huntPoolMatchesExpected === true &&
      report.cluster === "mainnet-beta" &&
      report.scavDecimalsOnChain === SCAV_DECIMALS &&
      !report.huntPoolSolLow;
    return NextResponse.json(report);
  } catch (err) {
    console.error("Admin health check error:", err);
    // Never echo the raw error: RPC errors can include the endpoint URL.
    report.ok = false;
    report.error = "Health check failed. See the server logs for details.";
    return NextResponse.json(report, { status: 500 });
  }
}
