const TICKER_ITEMS = [
  "FIRST HUNT ANNOUNCED 9.21.2026 9:00AM ET",
  "NYC",
  "FIND THE COIN",
  "CLAIM $SCAV",
  "NEW CLUE DROPS MONDAY",
  "THE HUNT IS ON",
];

export function TickerBar() {
  const text = `· ${TICKER_ITEMS.join(" · ")} ·`;
  return (
    <div className="overflow-hidden border-b border-[#2A2A2A] bg-[#0A0A0A] py-2">
      <div className="ticker-track flex w-max whitespace-nowrap">
        <span className="px-4 text-xs font-medium tracking-widest text-[#F5C518]">{text}</span>
        <span aria-hidden className="px-4 text-xs font-medium tracking-widest text-[#F5C518]">
          {text}
        </span>
      </div>
    </div>
  );
}
