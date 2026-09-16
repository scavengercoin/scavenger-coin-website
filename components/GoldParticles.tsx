// Deterministic hash so the same particle layout renders on the server and
// during client hydration — Math.random() here would cause a mismatch.
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function GoldParticles({ count = 18 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: pseudoRandom(i) * 100,
    size: 2 + pseudoRandom(i + 0.1) * 3,
    duration: 6 + pseudoRandom(i + 0.2) * 6,
    delay: pseudoRandom(i + 0.3) * 6,
    driftX: `${(pseudoRandom(i + 0.4) - 0.5) * 60}px`,
  }));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle absolute bottom-0 rounded-full bg-[#FF6B1A]"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              "--drift-x": p.driftX,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
