import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  createTransferInstruction,
} from "@solana/spl-token";

export const SCAV_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_SCAV_MINT_ADDRESS ?? "BGuhyvwuV1z6hGCPHVShrDBwHDypQvnQPvsR1RDHrA3j"
);

export const SCAV_DECIMALS = 9;

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
  // Never broadcast, or definitively failed on-chain — safe to retry/roll back.
  | { status: "failed" }
  // Broadcast succeeded but we couldn't confirm it landed or didn't. It may
  // still confirm later — retrying automatically here could double-pay, so
  // the caller must NOT treat this as safe to roll back and retry.
  | { status: "uncertain"; signature: string };

export async function payoutScav(recipient: PublicKey, amountUiTokens: number): Promise<PayoutResult> {
  const connection = getConnection();
  const huntPool = getHuntPoolKeypair();

  const huntPoolAta = await getOrCreateAssociatedTokenAccount(
    connection,
    huntPool,
    SCAV_MINT,
    huntPool.publicKey
  );

  const recipientAta = await getOrCreateAssociatedTokenAccount(
    connection,
    huntPool, // hunt pool pays the rent to create the recipient's ATA if needed
    SCAV_MINT,
    recipient
  );

  const amountBaseUnits = BigInt(Math.round(amountUiTokens * 10 ** SCAV_DECIMALS));

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: huntPool.publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(createTransferInstruction(huntPoolAta.address, recipientAta.address, huntPool.publicKey, amountBaseUnits));
  transaction.sign(huntPool);

  let signature: string;
  try {
    signature = await connection.sendRawTransaction(transaction.serialize());
  } catch {
    // Never left our process as a broadcast transaction — nothing happened
    // on-chain, so this is unambiguously safe to treat as failed.
    return { status: "failed" };
  }

  try {
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return { status: "confirmed", signature };
  } catch (err) {
    console.error(`Confirmation failed for ${signature}, checking on-chain status directly:`, err);
    return checkBroadcastStatus(connection, signature);
  }
}

async function checkBroadcastStatus(connection: Connection, signature: string): Promise<PayoutResult> {
  try {
    const { value } = await connection.getSignatureStatus(signature);
    if (value?.err) {
      // Definitely landed and definitely failed on-chain — safe to retry.
      return { status: "failed" };
    }
    if (value?.confirmationStatus) {
      // Actually did land despite the confirm() call above erroring/timing out.
      return { status: "confirmed", signature };
    }
    // Not found (yet) — could still land later. Do not treat as safe to retry.
    return { status: "uncertain", signature };
  } catch (err) {
    console.error(`Could not even check status for ${signature}:`, err);
    return { status: "uncertain", signature };
  }
}

export async function huntPoolAtaAddress(): Promise<PublicKey> {
  const huntPool = getHuntPoolKeypair();
  return getAssociatedTokenAddress(SCAV_MINT, huntPool.publicKey);
}
