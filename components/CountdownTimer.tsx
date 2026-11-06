"use client";

import { useEffect, useState } from "react";

function getRemaining(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export function CountdownTimer({ dropsAt }: { dropsAt: string }) {
  const [target] = useState(() => new Date(dropsAt));
  // Date.now() at render time would differ between the server render and the
  // client hydration render, causing a hydration mismatch — so the real
  // countdown is only computed after mount, once there's no SSR pass to match.
  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining> | null>(null);

  useEffect(() => {
    const update = () => setRemaining(getRemaining(target));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  const units = [
    { label: "DAYS", value: remaining?.days },
    { label: "HRS", value: remaining?.hours },
    { label: "MIN", value: remaining?.minutes },
    { label: "SEC", value: remaining?.seconds },
  ];

  return (
    <div className="flex gap-3 sm:gap-4">
      {units.map((u) => (
        <div
          key={u.label}
          className="flex w-16 flex-col items-center rounded-md border border-line bg-bg/60 py-2 sm:w-20"
        >
          <span className="font-mono text-2xl font-semibold text-accent tabular-nums sm:text-3xl">
            {u.value === undefined ? "--" : String(u.value).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] tracking-widest text-ink/60">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
