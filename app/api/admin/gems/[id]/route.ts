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

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/gems/[id]">) {
  const { id } = await ctx.params;

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

  // The form always sends every field, so blanks intentionally clear the column.
  const { data, error } = await getSupabaseAdmin()
    .from("hidden_gems")
    .update(parsed.fields)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Admin gem update error:", error);
    return NextResponse.json({ error: saveErrorMessage(error, "Failed to save gem") }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Gem not found" }, { status: 404 });
  }

  return NextResponse.json({ gem: data });
}
