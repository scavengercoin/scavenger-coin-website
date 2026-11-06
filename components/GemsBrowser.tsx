"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  CATEGORY_META,
  GEM_CATEGORIES,
  RATING_KEYS,
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

function Dollars({ value }: { value: number }) {
  return (
    <span aria-hidden className="font-semibold tracking-wider">
      <span className="text-accent">{"$".repeat(value)}</span>
      <span className="text-ink/40">{"$".repeat(5 - value)}</span>
    </span>
  );
}

function Ratings({ gem }: { gem: Gem }) {
  const rows = RATING_KEYS.filter((k) => gem.ratings?.[k]);
  if (rows.length === 0 && !gem.price) return null;
  return (
    <dl className="mt-1 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 text-xs">
      {rows.map((key) => (
        <div key={key} className="contents">
          <dt className="text-ink/60">{RATING_LABELS[key]}</dt>
          <dd className="text-sm" aria-label={`${RATING_LABELS[key]}: ${gem.ratings![key]} out of 5`}>
            <Stars value={gem.ratings![key]!} />
          </dd>
        </div>
      ))}
      {gem.price ? (
        <div className="contents">
          <dt className="text-ink/60">Price</dt>
          <dd className="text-sm" aria-label={`Price: ${gem.price} out of 5`}>
            <Dollars value={gem.price} />
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function GemCard({ gem }: { gem: Gem }) {
  const meta = CATEGORY_META[gem.category];
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition hover:border-accent/40">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-surface to-bg">
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
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-bg/80 px-2.5 py-1 text-[11px] font-semibold tracking-widest text-accent backdrop-blur">
          <span aria-hidden>{meta.emoji}</span>
          {meta.label.toUpperCase()}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-2xl leading-tight">{gem.name}</h3>
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
        <Ratings gem={gem} />
        {gem.hunt_week && (
          <p className="mt-auto pt-2">
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
