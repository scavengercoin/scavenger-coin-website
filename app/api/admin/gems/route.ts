import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { parseGemInput } from "@/lib/gem-input";

// Proxy.ts already gates every /api/admin/* route behind ADMIN_PASSWORD
// (Basic Auth) before requests reach here.

// The "certified" column was added after the table was first created. If a
// project hasn't run that migration yet, say so instead of a generic failure.
function saveErrorMessage(error: { message?: string }, fallback: string): string {
  return error.message?.includes("certified")
    ? "The database is missing the 'certified' column. Run the hidden_gems certified SQL from docs/supabase-schema.sql in Supabase, then try again."
    : fallback;
}

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("hidden_gems")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin gems list error:", error);
    return NextResponse.json({ error: "Failed to load gems" }, { status: 500 });
  }
  return NextResponse.json({ gems: data });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = parseGemInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin().from("hidden_gems").insert(parsed.fields).select().single();

  if (error) {
    console.error("Admin gem insert error:", error);
    return NextResponse.json({ error: saveErrorMessage(error, "Failed to add gem") }, { status: 500 });
  }

  return NextResponse.json({ gem: data });
}
