import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { parseClaimTx, withBonusSent } from "@/lib/claim-status";

type Body = {
  code?: string;
  type?: "claim" | "bonus";
  outcome?: "confirmed" | "failed";
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = body.code?.trim().toLowerCase();
  const { type, outcome } = body;
  if (!code || !type || !outcome) {
    return NextResponse.json({ error: "Missing code, type, or outcome" }, { status: 400 });
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

  const state = parseClaimTx(coin.claim_tx);

  if (type === "claim") {
    if (state.claimStatus !== "pending_review") {
      return NextResponse.json({ error: "This code's claim isn't pending review" }, { status: 409 });
    }
    if (outcome === "confirmed") {
      await supabase.from("coins").update({ claim_tx: state.claimSig }).eq("code", code);
      return NextResponse.json({ resolved: "claim_confirmed" });
    }
    // outcome === "failed" — it never actually landed, safe to roll the whole claim back.
    await supabase
      .from("coins")
      .update({ status: "unclaimed", claimed_by: null, claimed_at: null, claim_tx: null })
      .eq("code", code);
    return NextResponse.json({ resolved: "claim_rolled_back" });
  }

  // type === "bonus"
  if (state.bonusStatus !== "pending_review") {
    return NextResponse.json({ error: "This code's bonus isn't pending review" }, { status: 409 });
  }
  if (outcome === "confirmed") {
    await supabase
      .from("coins")
      .update({ claim_tx: withBonusSent(state.claimSig as string, state.bonusSig as string) })
      .eq("code", code);
    return NextResponse.json({ resolved: "bonus_confirmed" });
  }
  // outcome === "failed" — strip the bonus marker entirely so it can be sent again.
  await supabase.from("coins").update({ claim_tx: state.claimSig }).eq("code", code);
  return NextResponse.json({ resolved: "bonus_cleared" });
}
