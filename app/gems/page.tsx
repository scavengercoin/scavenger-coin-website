import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GemsBrowser } from "@/components/GemsBrowser";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Gem } from "@/lib/gems";

export const metadata: Metadata = {
  title: "Hidden Gems | Scavenger Coin ($SCAV)",
  description:
    "Our favorite NYC cafes, lunch spots, dinner spots, bars, sunset views and landmarks, featured alongside each week's hunt.",
};

// Gems are added from /admin without a redeploy, so render per request
// instead of baking the list in at build time.
export const dynamic = "force-dynamic";

async function loadGems(): Promise<Gem[] | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("hidden_gems")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Gem[];
  } catch (err) {
    console.error("Failed to load hidden gems:", err);
    return null;
  }
}

export default async function GemsPage() {
  const gems = await loadGems();

  return (
    <main className="flex-1 bg-[#0A0A0A] text-[#F0EDE8]">
      <header className="relative overflow-hidden border-b border-[#2A2A2A] bg-gradient-to-b from-[#14110A] to-[#0A0A0A] px-6 pb-10 pt-12 text-center sm:pb-14 sm:pt-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <Image
            src="/scav-logo.jpg"
            alt="Scavenger Coin pigeon"
            width={72}
            height={72}
            className="rounded-full border border-[#2A2A2A]"
            priority
          />
          <h1 className="font-display text-5xl leading-none sm:text-7xl">HIDDEN GEMS</h1>
          <p className="text-balance text-sm text-[#F0EDE8]/60 sm:text-base">
            We know all the best spots in the city. Cafes, lunch counters, dinner tables, bars and views,
            all featured alongside the weekly hunt.
          </p>
          <Link
            href="/"
            className="text-xs font-medium tracking-widest text-[#F0EDE8]/40 transition hover:text-[#F5C518]"
          >
            ← BACK TO THE HUNT
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        {gems === null ? (
          <p className="py-16 text-center text-sm text-[#F0EDE8]/50">
            We couldn&apos;t load the list. Try again in a minute.
          </p>
        ) : (
          <GemsBrowser gems={gems} />
        )}
      </section>
    </main>
  );
}
