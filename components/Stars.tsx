const STARS = [
  { top: "8%", left: "12%", size: 2, delay: "0s" },
  { top: "14%", left: "85%", size: 2.5, delay: "1.2s" },
  { top: "22%", right: "8%", size: 1.5, delay: "2.4s" },
] as const;

export function Stars() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {STARS.map((s, i) => (
        <span
          key={i}
          className="twinkle absolute rounded-full bg-[#E8F0FF]"
          style={{
            top: s.top,
            left: "left" in s ? s.left : undefined,
            right: "right" in s ? s.right : undefined,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}
