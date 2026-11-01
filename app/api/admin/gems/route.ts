import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isGemCategory } from "@/lib/gems";

// Proxy.ts already gates every /api/admin/* route behind ADMIN_PASSWORD
// (Basic Auth) before requests reach here.

type GemBody = {
  name?: string;
  category?: string;
  neighborhood?: string;
  address?: string;
  description?: string;
  photoUrl?: string;
  huntWeek?: string;
};

// Trim, cap length, and store blank fields as null rather than "".
function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().slice(0, max);
  return v || null;
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: GemBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = clean(body.name, 120);
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!isGemCategory(body.category)) {
    return NextResponse.json({ error: "Pick a valid category" }, { status: 400 });
  }

  const photoUrl = clean(body.photoUrl, 2000);
  if (photoUrl && !isHttpUrl(photoUrl)) {
    return NextResponse.json({ error: "Photo URL must start with http:// or https://" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("hidden_gems")
    .insert({
      name,
      category: body.category,
      neighborhood: clean(body.neighborhood, 120),
      address: clean(body.address, 240),
      description: clean(body.description, 1000),
      photo_url: photoUrl,
      hunt_week: clean(body.huntWeek, 60),
    })
    .select()
    .single();

  if (error) {
    console.error("Admin gem insert error:", error);
    return NextResponse.json({ error: "Failed to add gem" }, { status: 500 });
  }

  return NextResponse.json({ gem: data });
}
