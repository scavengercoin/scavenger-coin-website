"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CATEGORY_META, GEM_CATEGORIES, huntLabel, type Gem, type GemCategory } from "@/lib/gems";

type Filter = "all" | GemCategory;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...GEM_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label })),
];

function GemCard({ gem }: { gem: Gem }) {
  const meta = CATEGORY_META[gem.category];
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#141414] transition hover:border-[#F5C518]/40">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-[#1B1608] to-[#0A0A0A]">
        {gem.photo_url ? (
          // Plain <img>: photo URLs can point at any host, so next/image's
          // remotePatterns allowlist doesn't fit here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gem.photo_url}
            alt={gem.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Image
              src="/scav-logo.jpg"
              alt=""
              width={72}
              height={72}
              className="rounded-full opacity-40 grayscale"
            />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-[#F5C518]/30 bg-[#0A0A0A]/80 px-2.5 py-1 text-[11px] font-semibold tracking-widest text-[#F5C518] backdrop-blur">
          <span aria-hidden>{meta.emoji}</span>
          {meta.label.toUpperCase()}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-2xl leading-tight">{gem.name}</h3>
        {(gem.neighborhood || gem.address) && (
          <p className="text-xs text-[#F0EDE8]/50">
            {gem.neighborhood && <span className="font-medium text-[#F0EDE8]/70">{gem.neighborhood}</span>}
            {gem.neighborhood && gem.address && " · "}
            {gem.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${gem.name} ${gem.address}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 transition hover:text-[#F5C518] hover:underline"
              >
                {gem.address}
              </a>
            )}
          </p>
        )}
        {gem.description && (
          <p className="line-clamp-4 text-sm leading-relaxed text-[#F0EDE8]/60">{gem.description}</p>
        )}
        {gem.hunt_week && (
          <p className="mt-auto pt-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2A2A] bg-black/40 px-2.5 py-1 text-[11px] font-medium tracking-wide text-[#F0EDE8]/70">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#F5C518]" />
              Featured in {huntLabel(gem.hunt_week)}
            </span>
          </p>
        )}
      </div>
    </article>
  );
}

export function GemsBrowser({ gems }: { gems: Gem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return gems.filter((g) => {
      if (filter !== "all" && g.category !== filter) return false;
      if (!q) return true;
      return [g.name, g.description, g.neighborhood].some((field) => field?.toLowerCase().includes(q));
    });
  }, [gems, query, filter]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, neighborhood or vibe..."
          aria-label="Search hidden gems"
          className="w-full rounded-full border border-[#2A2A2A] bg-[#141414] px-5 py-3 text-sm text-[#F0EDE8] placeholder:text-[#F0EDE8]/30 focus:border-[#F5C518]/60 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.value)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide transition ${
                  active
                    ? "border-[#F5C518] bg-[#F5C518] text-[#0A0A0A]"
                    : "border-[#2A2A2A] bg-[#141414] text-[#F0EDE8]/60 hover:border-[#F5C518]/40 hover:text-[#F0EDE8]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((gem) => (
            <GemCard key={gem.id} gem={gem} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Image
            src="/scav-logo.jpg"
            alt=""
            width={72}
            height={72}
            className="rounded-full opacity-50 grayscale"
          />
          <p className="text-sm text-[#F0EDE8]/50">
            {gems.length === 0
              ? "No gems yet. We're still scouting."
              : "Nothing matches that. Try a different search."}
          </p>
        </div>
      )}
    </div>
  );
}
