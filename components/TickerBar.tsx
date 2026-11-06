const TICKER_TEXT = "Weekly Neighborhood Spotlight: Chelsea · Coin drops Saturday 11/14, 9:00 AM ET";

// One message repeated so the scrolling bar never shows a gap on wide screens.
// The track scrolls -50%, so both halves must be identical.
const COPIES_PER_HALF = 4;

function Half({ hidden }: { hidden?: boolean }) {
  return (
    <div aria-hidden={hidden || undefined} className="flex shrink-0">
      {Array.from({ length: COPIES_PER_HALF }, (_, i) => (
        <span
          key={i}
          // Only the first copy is read aloud; the rest are visual filler.
          aria-hidden={hidden || i > 0 || undefined}
          className="px-10 text-xs font-medium tracking-widest text-accent"
        >
          {TICKER_TEXT}
        </span>
      ))}
    </div>
  );
}

export function TickerBar() {
  return (
    <div className="overflow-hidden border-b border-line bg-bg py-2">
      <div className="ticker-track flex w-max whitespace-nowrap">
        <Half />
        <Half hidden />
      </div>
    </div>
  );
}
