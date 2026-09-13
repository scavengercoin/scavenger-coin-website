"use client";

import { useEffect, useState } from "react";

// Clues drop every Monday at 12:00 local time.
function nextDropDate(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setHours(12, 0, 0, 0);
  const daysUntilMonday = (1 - now.getDay() + 7) % 7;
  next.setDate(now.getDate() + daysUntilMonday);
  if (next <= now) next.setDate(next.getDate() + 7);
  return next;
}

function getRemaining(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export function CountdownTimer() {
  const [target] = useState(nextDropDate);
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
          className="flex w-16 flex-col items-center rounded-md border border-[#2A2A2A] bg-black/40 py-2 sm:w-20"
        >
          <span className="font-mono text-2xl font-semibold text-[#F5C518] tabular-nums sm:text-3xl">
            {u.value === undefined ? "--" : String(u.value).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] tracking-widest text-[#F0EDE8]/50">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
