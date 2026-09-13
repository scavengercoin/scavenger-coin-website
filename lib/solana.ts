import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  transfer,
} from "@solana/spl-token";

export const SCAV_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_SCAV_MINT_ADDRESS ?? "BGuhyvwuV1z6hGCPHVShrDBwHDypQvnQPvsR1RDHrA3j"
);

export const SCAV_DECIMALS = 9;

export function getConnection() {
  return new Connection(process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
}

export function getHuntPoolKeypair(): Keypair {
  const raw = process.env.HUNT_POOL_SECRET_KEY;
  if (!raw) throw new Error("HUNT_POOL_SECRET_KEY is not set");
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)));
}

export async function payoutScav(recipient: PublicKey, amountUiTokens: number): Promise<string> {
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

  return transfer(connection, huntPool, huntPoolAta.address, recipientAta.address, huntPool, amountBaseUnits);
}

export async function huntPoolAtaAddress(): Promise<PublicKey> {
  const huntPool = getHuntPoolKeypair();
  return getAssociatedTokenAddress(SCAV_MINT, huntPool.publicKey);
}
