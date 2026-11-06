const BUCKETS = [
  { label: "Liquidity", pct: 30, color: "#F3E0AE" },
  { label: "Founder", pct: 20, color: "#E2B24A" },
  { label: "Hunt Pool", pct: 15, color: "#CDA03E" },
  { label: "Marketing", pct: 15, color: "#B0852F" },
  { label: "Community", pct: 15, color: "#946D26" },
  { label: "Treasury", pct: 5, color: "#84632A" },
] as const;

const TOTAL_SUPPLY = 1_000_000_000;

export function TokenomicsChart() {
  return (
    <div className="w-full">
      {/* Single stacked bar, part-to-whole */}
      <div className="flex h-8 w-full overflow-hidden rounded-md border border-line sm:h-10">
        {BUCKETS.map((b) => (
          <div
            key={b.label}
            title={`${b.label}: ${b.pct}%`}
            style={{ width: `${b.pct}%`, backgroundColor: b.color }}
            className="h-full border-r-2 border-bg last:border-r-0"
          />
        ))}
      </div>

      {/* Legend: name, swatch, percentage, amount — identity is never color-alone */}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {BUCKETS.map((b) => (
          <li
            key={b.label}
            className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3"
          >
            <span className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: b.color }}
              />
              <span className="text-sm text-ink">{b.label}</span>
            </span>
            <span className="text-right">
              <span className="block font-mono text-sm font-semibold text-accent">
                {b.pct}%
              </span>
              <span className="block text-[11px] text-ink/60">
                {((TOTAL_SUPPLY * b.pct) / 100).toLocaleString()} SCAV
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
