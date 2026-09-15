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
  let body: { week?: string; rewardAmount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const week = body.week?.trim();
  const rewardAmount = body.rewardAmount ?? 500;

  if (!week) {
    return NextResponse.json({ error: "Missing week label" }, { status: 400 });
  }
  if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) {
    return NextResponse.json({ error: "Invalid reward amount" }, { status: 400 });
  }

  const code = randomBytes(5).toString("hex");
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("coins")
    .insert({ code, week, status: "unclaimed", reward_amount: rewardAmount })
    .select()
    .single();

  if (error) {
    console.error("Admin coin insert error:", error);
    return NextResponse.json({ error: "Failed to create claim code" }, { status: 500 });
  }

  return NextResponse.json({
    coin: data,
    claimUrl: `https://scavengercoin.com/claim?code=${code}`,
  });
}
