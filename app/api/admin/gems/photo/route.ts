import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Proxy.ts already gates every /api/admin/* route behind ADMIN_PASSWORD
// (Basic Auth) before requests reach here.

const BUCKET = "gems";
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
// The admin page shrinks photos to ~1200px before sending, so real uploads are
// a few hundred KB. This cap also keeps us under Vercel's ~4.5 MB body limit.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Photo must be a JPG, PNG or WebP" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too large (4 MB max)" }, { status: 413 });
  }

  const path = `${randomUUID()}.${ext}`;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    cacheControl: "31536000", // file names are random and never overwritten
  });

  if (error) {
    console.error("Admin gem photo upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
