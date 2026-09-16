// A faint dot-grid texture — pure decoration, kept as inline styles since the
// radial-gradient pattern isn't expressible as a plain Tailwind utility.
export function DotGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: "radial-gradient(circle, #FF6B1A 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        opacity: 0.03,
      }}
    />
  );
}
