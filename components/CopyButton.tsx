"use client";

import { useState } from "react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      // Some in-app browsers (wallet apps, social apps) block the async
      // clipboard API, so fall back to the older select-and-copy approach.
      const el = document.createElement("textarea");
      el.value = value;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      el.remove();
    }
    setState(ok ? "copied" : "failed");
    setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className="shrink-0 rounded-full border border-accent/60 px-3 py-1.5 text-[11px] font-semibold tracking-widest text-accent transition hover:border-accent hover:bg-accent hover:text-bg"
    >
      <span aria-live="polite">
        {state === "copied" ? "COPIED" : state === "failed" ? "COPY FAILED" : "COPY"}
      </span>
    </button>
  );
}
