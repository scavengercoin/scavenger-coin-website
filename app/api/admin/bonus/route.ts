import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { payoutScav } from "@/lib/solana";

const BONUS_AMOUNT = 500;

// Bonus payouts aren't tied to a claim code, so we log them into the
// existing claim_attempts table with a "bonus:" marker in `error` rather
// than adding a new table — keeps this working without any Supabase
// schema migration.
function logBonus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  fields: { wallet: string; success: boolean; note: string }
) {
  supabase
    .from("claim_attempts")
    .insert({ code: null, wallet: fields.wallet, success: fields.success, error: `bonus:${fields.note}` })
    .then(({ error }) => {
      if (error) console.error("Failed to log bonus payout:", error);
    });
}

export async function POST(req: NextRequest) {
  let body: { wallet?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const walletStr = body.wallet?.trim();
  if (!walletStr) {
    return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
  }

  let wallet: PublicKey;
  try {
    wallet = new PublicKey(walletStr);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const result = await payoutScav(wallet, BONUS_AMOUNT);

  if (result.status === "confirmed") {
    logBonus(supabase, { wallet: walletStr, success: true, note: result.signature });
    return NextResponse.json({ success: true, amount: BONUS_AMOUNT, txSignature: result.signature });
  }

  if (result.status === "uncertain") {
    // Do NOT let the admin UI imply it's safe to just click send again —
    // this may have already landed.
    logBonus(supabase, { wallet: walletStr, success: false, note: `uncertain:${result.signature}` });
    return NextResponse.json(
      {
        error: `Could not confirm this bonus went through (signature ${result.signature}). Check the explorer before retrying — do not resend blindly.`,
      },
      { status: 202 }
    );
  }

  logBonus(supabase, { wallet: walletStr, success: false, note: "failed" });
  return NextResponse.json({ error: "Bonus payout failed, safe to retry" }, { status: 500 });
}
