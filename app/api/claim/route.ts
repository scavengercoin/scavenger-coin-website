import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { payoutScav } from "@/lib/solana";
import { sendClaimNotification } from "@/lib/email";

const DEFAULT_REWARD = 1000; // SCAV per find, used when a coin row has no explicit reward_amount

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
  const code = req.nextUrl.searchParams.get("code")?.trim();
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
  let body: { code?: string; wallet?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = body.code?.trim();
  const walletStr = body.wallet?.trim();
  const supabase = getSupabaseAdmin();

  if (!code || !walletStr) {
    return NextResponse.json({ error: "Missing code or wallet" }, { status: 400 });
  }

  let wallet: PublicKey;
  try {
    wallet = new PublicKey(walletStr);
  } catch {
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

  const amount = coin.reward_amount ?? DEFAULT_REWARD;

  try {
    const txSignature = await payoutScav(wallet, amount);

    await supabase.from("coins").update({ claim_tx: txSignature }).eq("code", code);

    // Fire the notification alongside the transfer; a failure here must never
    // undo the claim or block the response to the finder.
    await sendClaimNotification({
      code,
      week: coin.week,
      wallet: walletStr,
      amount,
      txSignature,
    });

    logAttempt(supabase, { code, wallet: walletStr, success: true });
    return NextResponse.json({ success: true, amount, txSignature });
  } catch (err) {
    console.error("Payout failed after claim was recorded:", err);
    // Roll the row back to unclaimed so the finder (or support) can retry.
    await supabase
      .from("coins")
      .update({ status: "unclaimed", claimed_by: null, claimed_at: null })
      .eq("code", code);
    logAttempt(supabase, { code, wallet: walletStr, success: false, error: "payout_failed" });
    return NextResponse.json({ error: "Payout failed, please try again" }, { status: 500 });
  }
}
