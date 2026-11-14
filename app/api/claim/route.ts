import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { payoutScav, type PayoutResult } from "@/lib/solana";
import { sendClaimNotification } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// The payout waits for on-chain confirmation (up to ~50s, see lib/solana.ts).
export const maxDuration = 60;

// Fallback when a code has no reward_amount of its own. The bonus (paid later
// from /admin once the finder's social post is verified) is set per code too.
const DEFAULT_REWARD = 500;

function logAttempt(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  fields: { code?: string; wallet?: string; success: boolean; error?: string }
) {
  supabase
    .from("claim_attempts")
    .insert({ code: fields.code ?? null, wallet: fields.wallet ?? null, success: fields.success, error: fields.error ?? null })
    .then(({ error }) => {
      if (error) console.error("Failed to log claim attempt:", error);
    });
}

export async function GET(req: NextRequest) {
  const allowed = await checkRateLimit(getClientIp(req));
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests, please slow down" }, { status: 429 });
  }

  const code = req.nextUrl.searchParams.get("code")?.trim().toLowerCase();
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: coin, error } = await supabase
    .from("coins")
    .select("status, claimed_at, reward_amount")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("Supabase fetch error:", error);
    return NextResponse.json({ error: "Lookup failed, try again" }, { status: 500 });
  }

  if (!coin) {
    return NextResponse.json({ status: "unknown" }, { status: 404 });
  }

  return NextResponse.json({
    status: coin.status,
    claimedAt: coin.claimed_at,
    amount: coin.reward_amount,
  });
}

export async function POST(req: NextRequest) {
  const allowed = await checkRateLimit(getClientIp(req));
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests, please slow down" }, { status: 429 });
  }

  let body: { code?: string; wallet?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = body.code?.trim().toLowerCase();
  const walletStr = body.wallet?.trim();
  const supabase = getSupabaseAdmin();

  if (!code || !walletStr) {
    return NextResponse.json({ error: "Missing code or wallet" }, { status: 400 });
  }
  if (code.length > 64) {
    return NextResponse.json({ error: "Invalid claim code" }, { status: 400 });
  }

  let wallet: PublicKey;
  try {
    wallet = new PublicKey(walletStr);
  } catch {
    logAttempt(supabase, { code, wallet: walletStr, success: false, error: "invalid_wallet" });
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  // A real wallet is always on the ed25519 curve. Anything else is a program
  // address that can't own a normal token account: reject it before the code
  // is touched instead of failing at payout time.
  if (!PublicKey.isOnCurve(wallet.toBytes())) {
    logAttempt(supabase, { code, wallet: walletStr, success: false, error: "invalid_wallet" });
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const { data: coin, error: fetchError } = await supabase
    .from("coins")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (fetchError) {
    console.error("Supabase fetch error:", fetchError);
    logAttempt(supabase, { code, wallet: walletStr, success: false, error: "lookup_failed" });
    return NextResponse.json({ error: "Lookup failed, try again" }, { status: 500 });
  }

  if (!coin) {
    logAttempt(supabase, { code, wallet: walletStr, success: false, error: "unknown_code" });
    return NextResponse.json({ error: "Unknown claim code" }, { status: 404 });
  }

  if (coin.status === "claimed") {
    logAttempt(supabase, { code, wallet: walletStr, success: false, error: "already_claimed" });
    return NextResponse.json({ error: "This coin has already been claimed" }, { status: 409 });
  }

  // Atomically flip the row to claimed first so two simultaneous requests for
  // the same code can't both pass the check above and both trigger a payout.
  const { data: claimedRow, error: claimError } = await supabase
    .from("coins")
    .update({ status: "claimed", claimed_by: walletStr, claimed_at: new Date().toISOString() })
    .eq("code", code)
    .eq("status", "unclaimed")
    .select()
    .maybeSingle();

  if (claimError || !claimedRow) {
    logAttempt(supabase, { code, wallet: walletStr, success: false, error: "race_already_claimed" });
    return NextResponse.json({ error: "This coin has already been claimed" }, { status: 409 });
  }

  const rollBack = () =>
    supabase
      .from("coins")
      .update({ status: "unclaimed", claimed_by: null, claimed_at: null, claim_tx: null })
      .eq("code", code)
      .eq("claimed_by", walletStr);

  const amount = coin.reward_amount ?? DEFAULT_REWARD;
  let result: PayoutResult;
  try {
    result = await payoutScav(wallet, amount, {
      // Record the signature as "pending review" before anything is broadcast.
      // If this function dies mid-payout, the code is flagged in /admin with
      // the signature to check, instead of sitting claimed with no trace.
      onSigned: async (signature) => {
        const { error } = await supabase
          .from("coins")
          .update({ claim_tx: `PENDING_REVIEW:${signature}` })
          .eq("code", code);
        if (error) throw new Error(`Could not record pending payout: ${error.message}`);
      },
    });
  } catch (err) {
    // payoutScav is written never to throw; if it somehow does, nothing was
    // confirmed, so treat it like any other pre-send failure.
    console.error("Unexpected payout error (code:", code, "):", err);
    result = { status: "failed" };
  }

  if (result.status === "confirmed") {
    await supabase.from("coins").update({ claim_tx: result.signature }).eq("code", code);

    // Fire the notification alongside the transfer; a failure here must never
    // undo the claim or block the response to the finder.
    await sendClaimNotification({
      code,
      week: coin.week,
      wallet: walletStr,
      amount,
      txSignature: result.signature,
    });

    logAttempt(supabase, { code, wallet: walletStr, success: true });
    return NextResponse.json({ success: true, amount, txSignature: result.signature });
  }

  if (result.status === "uncertain") {
    // The transfer may or may not have actually landed on-chain. Retrying
    // automatically here risks paying out twice, so we deliberately do NOT
    // roll the code back to unclaimed. It stays flagged PENDING_REVIEW (set in
    // onSigned above; written again here in case that row was changed).
    await supabase
      .from("coins")
      .update({ claim_tx: `PENDING_REVIEW:${result.signature}` })
      .eq("code", code);
    logAttempt(supabase, { code, wallet: walletStr, success: false, error: `payout_uncertain:${result.signature}` });
    return NextResponse.json(
      {
        error:
          "We couldn't confirm your payout went through, but your claim is recorded — please email support@scavengercoin.com with this code and we'll sort it out.",
      },
      { status: 202 }
    );
  }

  // result.status === "failed": nothing was sent, or it landed and failed
  // on-chain. Either way no SCAV moved, so roll the code back to unclaimed
  // (clearing the pending marker too) and let the finder retry.
  console.error("Payout failed after claim was recorded (code:", code, ")");
  await rollBack();
  logAttempt(supabase, { code, wallet: walletStr, success: false, error: "payout_failed" });
  return NextResponse.json({ error: "Payout failed, please try again" }, { status: 500 });
}
