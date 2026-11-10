"use client";

import { useEffect, useState } from "react";
import type { MarketData } from "@/lib/token";

const REFRESH_MS = 60_000;

// SCAV trades at a fraction of a cent, so show significant digits, not 2 decimals.
function fmtPrice(n: number): string {
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toLocaleString("en-US", { maximumSignificantDigits: 4, maximumFractionDigits: 12 })}`;
}

function fmtUsd(n: number | null): string {
  if (n === null) return "N/A";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 0 : 2 })}`;
}

function fmtChange(n: number | null): string {
  if (n === null) return "N/A";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function MarketStats({ initial }: { initial: MarketData | null }) {
  const [data, setData] = useState<MarketData | null>(initial);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch("/api/market");
        if (!res.ok) return;
        const body = (await res.json()) as { data: MarketData | null };
        // Keep the last good numbers on screen if one refresh comes back empty.
        if (!cancelled && body.data) setData(body.data);
      } catch {
        // Network blip: leave what's showing and try again next minute.
      }
    };
    const id = setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <div className="rounded-xl border border-line bg-surface px-5 py-8 text-center">
        <p className="text-sm font-medium text-ink">Market data unavailable</p>
        <p className="mt-1 text-xs text-ink/60">
          We couldn&apos;t reach Dexscreener just now. This section refreshes on its own every minute.
        </p>
      </div>
    );
  }

  const stats = [
    { label: "Price (USD)", value: fmtPrice(data.priceUsd) },
    { label: "Liquidity", value: fmtUsd(data.liquidityUsd) },
    { label: "FDV", value: fmtUsd(data.fdv) },
    { label: "24h volume", value: fmtUsd(data.volume24h) },
    { label: "24h change", value: fmtChange(data.change24h) },
  ];

  return (
    <div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface px-4 py-4">
            <dt className="text-[11px] font-medium uppercase tracking-widest text-ink/60">{s.label}</dt>
            <dd className="mt-1.5 whitespace-nowrap font-mono text-[15px] font-semibold text-ink">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink/60">
        Source: Dexscreener, official SCAV/SOL pool. Refreshes every 60 seconds. Last updated{" "}
        <time dateTime={data.fetchedAt} suppressHydrationWarning>
          {new Date(data.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </time>
        .
      </p>
    </div>
  );
}
