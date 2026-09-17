import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

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

  // Same convention as docs/HUNT_OPERATIONS.md's manual SQL: mark it claimed
  // by a sentinel value rather than deleting, so it's blocked from ever being
  // claimed for real while staying in the history.
  const { data, error } = await supabase
    .from("coins")
    .update({ status: "claimed", claimed_by: "EXPIRED - no winner", claimed_at: new Date().toISOString() })
    .eq("code", code)
    .eq("status", "unclaimed")
    .select()
    .maybeSingle();

  if (error) {
    console.error("Admin expire error:", error);
    return NextResponse.json({ error: "Failed to expire code" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Code not found or already claimed" }, { status: 404 });
  }

  return NextResponse.json({ coin: data });
}
