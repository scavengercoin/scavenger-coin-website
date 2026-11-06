"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  CATEGORY_META,
  CATEGORY_RATINGS,
  GEM_CATEGORIES,
  RATING_LABELS,
  spotlightLabel,
  type Gem,
  type GemCategory,
} from "@/lib/gems";

type Filter = "all" | GemCategory;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...GEM_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label })),
];

function Stars({ value }: { value: number }) {
  return (
    <span aria-hidden className="tracking-[0.15em]">
      <span className="text-accent">{"★".repeat(value)}</span>
      <span className="text-ink/40">{"★".repeat(5 - value)}</span>
    </span>
  );
}

const PRICE_TIERS = 4;

function Dollars({ value }: { value: number }) {
  return (
    <span aria-hidden className="font-semibold tracking-wider">
      <span className="text-accent">{"$".repeat(value)}</span>
      <span className="text-ink/40">{"$".repeat(PRICE_TIERS - value)}</span>
    </span>
  );
}

function Ratings({ gem }: { gem: Gem }) {
  // Fixed order per category (see CATEGORY_RATINGS), not whatever order the data has.
  const rows = CATEGORY_RATINGS[gem.category].filter((k) => gem.ratings?.[k]);
  const price = gem.price ? Math.min(gem.price, PRICE_TIERS) : null;
  if (rows.length === 0 && !price) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 text-xs">
      {rows.map((key) => (
        <div key={key} className="contents">
          <dt className="text-ink/60">{RATING_LABELS[key]}</dt>
          <dd className="text-sm" aria-label={`${RATING_LABELS[key]}: ${gem.ratings![key]} out of 5`}>
            <Stars value={gem.ratings![key]!} />
          </dd>
        </div>
      ))}
      {price ? (
        <div className="contents">
          <dt className="text-ink/60">Price</dt>
          <dd className="text-sm" aria-label={`Price: ${price} out of ${PRICE_TIERS}`}>
            <Dollars value={price} />
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function GemCard({ gem }: { gem: Gem }) {
  const meta = CATEGORY_META[gem.category];
  return (
    // The grid gives every card three row tracks (photo, title, body) that are shared
    // with the other cards in the same row via subgrid, so titles and ratings start
    // at the same height and any leftover space falls at the bottom of the card.
    <article className="row-span-3 grid grid-rows-subgrid gap-y-0 overflow-hidden rounded-xl border border-line bg-surface transition hover:border-accent/40">
      <div className="relative aspect-[4/5] bg-gradient-to-br from-surface to-bg">
        {gem.photo_url ? (
          // Plain <img>: photo URLs can point at any host, so next/image's
          // remotePatterns allowlist doesn't fit here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gem.photo_url}
            alt={gem.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/scav-logo.jpg"
              alt=""
              width={72}
              height={72}
              className="rounded-full opacity-40 grayscale"
            />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-bg/80 px-2.5 py-1 text-[11px] font-semibold tracking-widest text-accent backdrop-blur">
          <span aria-hidden>{meta.emoji}</span>
          {meta.label.toUpperCase()}
        </span>
      </div>

      <h3 className="font-display px-5 pt-5 text-2xl leading-tight">{gem.name}</h3>

      <div className="flex flex-col gap-2 px-5 pb-5 pt-3">
        <Ratings gem={gem} />
        {(gem.neighborhood || gem.address) && (
          <p className="text-xs text-ink/60">
            {gem.neighborhood && <span className="font-medium text-ink/70">{gem.neighborhood}</span>}
            {gem.neighborhood && gem.address && " · "}
            {gem.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${gem.name} ${gem.address}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 transition hover:text-accent hover:underline"
              >
                {gem.address}
              </a>
            )}
          </p>
        )}
        {gem.description && (
          <p className="line-clamp-4 text-sm leading-relaxed text-ink/60">{gem.description}</p>
        )}
        {gem.hunt_week && (
          <p className="pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg/60 px-2.5 py-1 text-[11px] font-medium tracking-wide text-ink/70">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
              {spotlightLabel(gem.hunt_week)}
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
          className="w-full rounded-full border border-ink/40 bg-surface px-5 py-3 text-sm text-ink placeholder:text-ink/60 focus:border-accent focus:outline-none"
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
                    ? "border-accent bg-accent text-bg"
                    : "border-line bg-surface text-ink/60 hover:border-accent/40 hover:text-ink"
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
          <p className="text-sm text-ink/60">
            {gems.length === 0
              ? "No gems yet. We're still scouting."
              : "Nothing matches that. Try a different search."}
          </p>
        </div>
      )}
    </div>
  );
}
