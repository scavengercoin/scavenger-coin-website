import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { payoutScav } from "@/lib/solana";
import { parseClaimTx, withBonusPending, withBonusSent, withBonusPendingReview } from "@/lib/claim-status";

const BONUS_AMOUNT = 500;

function logBonus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  fields: { code: string; wallet: string; success: boolean; note: string }
) {
  supabase
    .from("claim_attempts")
    .insert({ code: fields.code, wallet: fields.wallet, success: fields.success, error: `bonus:${fields.note}` })
    .then(({ error }) => {
      if (error) console.error("Failed to log bonus payout:", error);
    });
}

export async function POST(req: NextRequest) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = body.code?.trim().toLowerCase();
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: coin, error: fetchError } = await supabase
    .from("coins")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (fetchError || !coin) {
    return NextResponse.json({ error: "Claim code not found" }, { status: 404 });
  }
  if (coin.status !== "claimed" || coin.claimed_by === "EXPIRED - no winner") {
    return NextResponse.json({ error: "This code has no valid finder to bonus" }, { status: 400 });
  }

  const state = parseClaimTx(coin.claim_tx);
  if (state.claimStatus !== "confirmed") {
    return NextResponse.json(
      { error: "The automatic claim payout isn't confirmed yet — resolve that first" },
      { status: 409 }
    );
  }
  if (state.bonusStatus !== "none") {
    return NextResponse.json(
      { error: `Bonus already ${state.bonusStatus === "sent" ? "sent" : "in progress"} for this code` },
      { status: 409 }
    );
  }

  let wallet: PublicKey;
  try {
    wallet = new PublicKey(coin.claimed_by);
  } catch {
    return NextResponse.json({ error: "Recorded finder wallet is invalid" }, { status: 500 });
  }

  // Atomic reservation: this UPDATE only matches if claim_tx is still
  // exactly what we just read. Two concurrent requests (double-click, or a
  // refreshed page resubmitting) can't both win this — only one will find
  // the row still matching, so only one will proceed to send anything.
  const reservedClaimTx = withBonusPending(coin.claim_tx as string);
  const { data: reserved, error: reserveError } = await supabase
    .from("coins")
    .update({ claim_tx: reservedClaimTx })
    .eq("code", code)
    .eq("claim_tx", coin.claim_tx)
    .select()
    .maybeSingle();

  if (reserveError || !reserved) {
    return NextResponse.json({ error: "Bonus already being processed for this code" }, { status: 409 });
  }

  const result = await payoutScav(wallet, BONUS_AMOUNT);

  if (result.status === "confirmed") {
    await supabase
      .from("coins")
      .update({ claim_tx: withBonusSent(coin.claim_tx as string, result.signature) })
      .eq("code", code);
    logBonus(supabase, { code, wallet: coin.claimed_by, success: true, note: result.signature });
    return NextResponse.json({ success: true, amount: BONUS_AMOUNT, txSignature: result.signature });
  }

  if (result.status === "uncertain") {
    // Do NOT clear the reservation — this may have already landed. Leave it
    // flagged for manual resolution instead of letting anyone retry blindly.
    await supabase
      .from("coins")
      .update({ claim_tx: withBonusPendingReview(coin.claim_tx as string, result.signature) })
      .eq("code", code);
    logBonus(supabase, { code, wallet: coin.claimed_by, success: false, note: `uncertain:${result.signature}` });
    return NextResponse.json(
      {
        error: `Could not confirm this bonus went through (signature ${result.signature}). It's flagged for review on the admin page — resolve it there before retrying.`,
      },
      { status: 202 }
    );
  }

  // Definitively failed — safe to clear the reservation and allow a retry.
  await supabase.from("coins").update({ claim_tx: coin.claim_tx }).eq("code", code);
  logBonus(supabase, { code, wallet: coin.claimed_by, success: false, note: "failed" });
  return NextResponse.json({ error: "Bonus payout failed, safe to retry" }, { status: 500 });
}
