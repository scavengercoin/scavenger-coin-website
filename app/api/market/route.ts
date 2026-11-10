import { NextResponse } from "next/server";
import { getMarketData } from "@/lib/token";

// Cached for 60 seconds: the /token page polls this instead of hitting
// Dexscreener from every visitor's browser.
export const revalidate = 60;

export async function GET() {
  const data = await getMarketData();
  return NextResponse.json({ data });
}
