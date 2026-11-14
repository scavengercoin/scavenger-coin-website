import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SendTransactionError,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

export const SCAV_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_SCAV_MINT_ADDRESS ?? "BfuWHs9zwKvQz85b9RCi8mWuPtmo2ZCpQUtYR49F3zJP"
);

export const SCAV_DECIMALS = 9;

// Hard ceiling on what one payout may spend on its priority fee.
const MAX_PRIORITY_FEE_LAMPORTS = 500_000; // 0.0005 SOL
// Floor so a quiet-network estimate of 0 still gets the transaction picked up.
const MIN_PRIORITY_FEE_MICRO_LAMPORTS = 10_000;
// Used only if simulation doesn't report how much compute the payout needs.
const FALLBACK_COMPUTE_UNITS = 120_000;
const MAX_COMPUTE_UNITS = 200_000;
// How often the signed transaction is re-sent while waiting for it to land.
const REBROADCAST_INTERVAL_MS = 2_000;
// Stop waiting a little before the route's 60s maxDuration so the function
// always gets to record the outcome instead of being killed mid-wait.
const REBROADCAST_BUDGET_MS = 50_000;

export function getConnection() {
  return new Connection(process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed");
}

export function getHuntPoolKeypair(): Keypair {
  const raw = process.env.HUNT_POOL_SECRET_KEY;
  if (!raw) throw new Error("HUNT_POOL_SECRET_KEY is not set");
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)));
}

export type PayoutResult =
  | { status: "confirmed"; signature: string }
  // Never broadcast, or definitively failed on-chain: safe to retry/roll back.
  | { status: "failed" }
  // Broadcast but we couldn't confirm it landed or didn't. It may still
  // confirm later, and retrying automatically could double-pay, so the caller
  // must NOT treat this as safe to roll back and retry.
  | { status: "uncertain"; signature: string };

export type PayoutOptions = {
  /**
   * Called with the transaction's signature after it is signed but BEFORE it
   * is broadcast. Callers persist it here (as "pending review") so that even
   * if this process dies mid-flight, the signature is on record and the
   * payout can be checked by hand. If this throws, nothing is sent.
   */
  onSigned?: (signature: string) => Promise<void>;
};

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function toBase58(bytes: Uint8Array): string {
  let n = BigInt(0);
  for (const b of bytes) n = n * BigInt(256) + BigInt(b);
  let out = "";
  const base = BigInt(58);
  while (n > BigInt(0)) {
    out = BASE58_ALPHABET[Number(n % base)] + out;
    n = n / base;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

function toBaseUnits(amountUiTokens: number): bigint {
  const whole = Math.trunc(amountUiTokens);
  const fraction = Math.round((amountUiTokens - whole) * 10 ** SCAV_DECIMALS);
  return BigInt(whole) * BigInt(10 ** SCAV_DECIMALS) + BigInt(fraction);
}

/**
 * Priority fee in micro-lamports per compute unit. Asks Helius for its
 * estimate for these accounts; on any other RPC (or if that call fails) falls
 * back to the standard recent-fees method. Never throws.
 */
async function estimatePriorityFee(connection: Connection, writableAccounts: PublicKey[]): Promise<number> {
  try {
    const res = await fetch(connection.rpcEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "scav-priority-fee",
        method: "getPriorityFeeEstimate",
        params: [{ accountKeys: writableAccounts.map((k) => k.toBase58()), options: { priorityLevel: "High" } }],
      }),
      signal: AbortSignal.timeout(4000),
    });
    const body = (await res.json()) as { result?: { priorityFeeEstimate?: number } };
    const estimate = body.result?.priorityFeeEstimate;
    if (typeof estimate === "number" && Number.isFinite(estimate) && estimate >= 0) return Math.ceil(estimate);
  } catch {
    // Not Helius, or the estimate call failed: use the fallback below.
  }
  try {
    const recent = await connection.getRecentPrioritizationFees({ lockedWritableAccounts: writableAccounts });
    const fees = recent.map((f) => f.prioritizationFee).sort((a, b) => a - b);
    if (fees.length > 0) return fees[Math.floor(fees.length * 0.75)];
  } catch {
    // Fall through to the floor.
  }
  return MIN_PRIORITY_FEE_MICRO_LAMPORTS;
}

export type PreparedPayout = {
  instructions: TransactionInstruction[];
  computeUnitLimit: number;
  microLamportsPerUnit: number;
  /** The most this payout can spend on priority, in lamports. Always <= the cap. */
  maxPriorityFeeLamports: number;
};

/**
 * Builds the single payout transaction (create the finder's SCAV token account
 * if it's missing, then transfer) and simulates it. Nothing is signed or sent
 * here. Throws if the payout could not succeed (bad recipient, empty pool...).
 */
export async function preparePayout(
  connection: Connection,
  huntPoolAddress: PublicKey,
  recipient: PublicKey,
  amountUiTokens: number
): Promise<PreparedPayout> {
  const huntPoolAta = getAssociatedTokenAddressSync(SCAV_MINT, huntPoolAddress);
  // Throws for an off-curve owner (a program address, not a real wallet).
  const recipientAta = getAssociatedTokenAddressSync(SCAV_MINT, recipient);

  const payoutInstructions = [
    // Idempotent: creates the finder's token account (rent paid by the hunt
    // pool) or does nothing if it already exists. Same transaction as the
    // transfer, so either both happen or neither does.
    createAssociatedTokenAccountIdempotentInstruction(huntPoolAddress, recipientAta, recipient, SCAV_MINT),
    createTransferCheckedInstruction(
      huntPoolAta,
      SCAV_MINT,
      recipientAta,
      huntPoolAddress,
      toBaseUnits(amountUiTokens),
      SCAV_DECIMALS
    ),
  ];

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const simulated = await connection.simulateTransaction(
    new VersionedTransaction(
      new TransactionMessage({
        payerKey: huntPoolAddress,
        recentBlockhash: blockhash,
        instructions: [
          ComputeBudgetProgram.setComputeUnitLimit({ units: MAX_COMPUTE_UNITS }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }),
          ...payoutInstructions,
        ],
      }).compileToV0Message()
    ),
    { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" }
  );
  if (simulated.value.err) {
    throw new Error(`Payout simulation failed: ${JSON.stringify(simulated.value.err)}`);
  }

  const used = simulated.value.unitsConsumed;
  const computeUnitLimit = Math.min(
    MAX_COMPUTE_UNITS,
    used ? Math.ceil(used * 1.2) + 5_000 : FALLBACK_COMPUTE_UNITS
  );

  // The cap is on the total priority fee, so the per-unit ceiling depends on
  // how many units this transaction asks for.
  const ceiling = Math.floor((MAX_PRIORITY_FEE_LAMPORTS * 1_000_000) / computeUnitLimit);
  const estimate = await estimatePriorityFee(connection, [huntPoolAta, recipientAta]);
  const microLamportsPerUnit = Math.min(Math.max(estimate, MIN_PRIORITY_FEE_MICRO_LAMPORTS), ceiling);

  return {
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: microLamportsPerUnit }),
      ...payoutInstructions,
    ],
    computeUnitLimit,
    microLamportsPerUnit,
    maxPriorityFeeLamports: Math.ceil((computeUnitLimit * microLamportsPerUnit) / 1_000_000),
  };
}

type OnChainStatus = "confirmed" | "errored" | "not_found";

async function getOnChainStatus(
  connection: Connection,
  signature: string,
  searchHistory = false
): Promise<OnChainStatus | "unknown"> {
  try {
    const { value } = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: searchHistory,
    });
    const status = value[0];
    if (!status) return "not_found";
    if (status.err) return "errored";
    if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") return "confirmed";
    return "not_found"; // seen but only "processed": keep waiting
  } catch {
    return "unknown"; // couldn't ask: tells us nothing either way
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends SCAV from the hunt pool to `recipient` in ONE transaction and waits
 * for it to confirm. Never throws: every outcome is one of the three
 * PayoutResult states.
 */
export async function payoutScav(
  recipient: PublicKey,
  amountUiTokens: number,
  options: PayoutOptions = {}
): Promise<PayoutResult> {
  let connection: Connection;
  let transaction: VersionedTransaction;
  let signature: string;
  let lastValidBlockHeight: number;

  // ---- Everything up to here is local: any failure means nothing was sent.
  try {
    connection = getConnection();
    const huntPool = getHuntPoolKeypair();
    const prepared = await preparePayout(connection, huntPool.publicKey, recipient, amountUiTokens);

    const latest = await connection.getLatestBlockhash("confirmed");
    lastValidBlockHeight = latest.lastValidBlockHeight;
    transaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: huntPool.publicKey,
        recentBlockhash: latest.blockhash,
        instructions: prepared.instructions,
      }).compileToV0Message()
    );
    transaction.sign([huntPool]);
    signature = toBase58(transaction.signatures[0]);

    await options.onSigned?.(signature);
  } catch (err) {
    console.error("Payout failed before broadcast (nothing was sent):", err);
    return { status: "failed" };
  }

  // ---- From here on the transaction may be on the network.
  try {
    const raw = transaction.serialize();
    const deadline = Date.now() + REBROADCAST_BUDGET_MS;
    let accepted = false;
    let expired = false;

    while (true) {
      try {
        // Re-sending the same signed transaction is harmless: it has one
        // signature, so it can only ever land once.
        await connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 });
        accepted = true;
      } catch (err) {
        if (!accepted && err instanceof SendTransactionError) {
          // The RPC node explicitly refused it and no node has ever accepted it.
          console.error(`RPC rejected payout ${signature}:`, err.message);
          const status = await getOnChainStatus(connection, signature);
          if (status === "confirmed") return { status: "confirmed", signature };
          if (status === "not_found" || status === "errored") return { status: "failed" };
          return { status: "uncertain", signature };
        }
        // Network hiccup: it may or may not have gone out. Keep trying.
      }

      const status = await getOnChainStatus(connection, signature);
      if (status === "confirmed") return { status: "confirmed", signature };
      if (status === "errored") return { status: "failed" }; // landed and failed: nothing moved

      if (Date.now() >= deadline) break;
      const height = await connection.getBlockHeight("confirmed").catch(() => null);
      if (height !== null && height > lastValidBlockHeight) {
        expired = true;
        break;
      }
      await sleep(REBROADCAST_INTERVAL_MS);
    }

    // One last look, including history, before deciding.
    await sleep(REBROADCAST_INTERVAL_MS);
    const final = await getOnChainStatus(connection, signature, true);
    if (final === "confirmed") return { status: "confirmed", signature };
    if (final === "errored") return { status: "failed" };
    // The blockhash expired, no node ever accepted it, and it's nowhere
    // on-chain: it never went out and never can.
    if (final === "not_found" && expired && !accepted) return { status: "failed" };

    console.error(`Payout ${signature} was sent but not confirmed (expired: ${expired}); flagging for review`);
    return { status: "uncertain", signature };
  } catch (err) {
    console.error(`Unexpected error after broadcasting ${signature}:`, err);
    return { status: "uncertain", signature };
  }
}

export async function huntPoolAtaAddress(): Promise<PublicKey> {
  const huntPool = getHuntPoolKeypair();
  return getAssociatedTokenAddress(SCAV_MINT, huntPool.publicKey);
}
