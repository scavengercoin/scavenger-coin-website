"use client";

import { useEffect, useState } from "react";

const PHRASES = ["Find it.", "Scan it.", "Claim it."] as const;
const FADE_MS = 300;
const HOLD_MS = 2000;

export function CyclingPhrase() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % PHRASES.length);
        setVisible(true);
      }, FADE_MS);
    }, HOLD_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="inline-block min-w-[4.5em] text-[#F5C518] transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {PHRASES[index]}
    </span>
  );
}
