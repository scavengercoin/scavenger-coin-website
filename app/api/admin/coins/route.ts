import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Proxy.ts already gates every /api/admin/* route behind ADMIN_PASSWORD
// (Basic Auth) before requests reach here.

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coins")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin coins list error:", error);
    return NextResponse.json({ error: "Failed to load coins" }, { status: 500 });
  }

  return NextResponse.json({ coins: data });
}

export async function POST(req: NextRequest) {
  let body: { week?: string; rewardAmount?: number; bonusAmount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const week = body.week?.trim();
  const rewardAmount = body.rewardAmount ?? 500;
  // 0 is allowed: it means "this code has no bonus".
  const bonusAmount = body.bonusAmount ?? 500;

  if (!week) {
    return NextResponse.json({ error: "Missing week label" }, { status: 400 });
  }
  if (!Number.isInteger(rewardAmount) || rewardAmount <= 0) {
    return NextResponse.json({ error: "Invalid reward amount" }, { status: 400 });
  }
  if (!Number.isInteger(bonusAmount) || bonusAmount < 0) {
    return NextResponse.json({ error: "Invalid bonus amount" }, { status: 400 });
  }

  const code = randomBytes(5).toString("hex");
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("coins")
    .insert({ code, week, status: "unclaimed", reward_amount: rewardAmount, bonus_amount: bonusAmount })
    .select()
    .single();

  if (error) {
    console.error("Admin coin insert error:", error);
    const hint = error.message?.includes("bonus_amount")
      ? "The database is missing the 'bonus_amount' column. Run the coins bonus_amount SQL from docs/supabase-schema.sql in Supabase, then try again."
      : "Failed to create claim code";
    return NextResponse.json({ error: hint }, { status: 500 });
  }

  return NextResponse.json({
    coin: data,
    claimUrl: `https://www.scavengercoin.com/claim?code=${code}`,
  });
}
