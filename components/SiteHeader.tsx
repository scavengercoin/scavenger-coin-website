"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const onGems = usePathname() === "/gems";

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-bg px-4 sm:gap-4 sm:px-6">
      <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <Image
          src="/scav-logo.jpg"
          alt=""
          width={32}
          height={32}
          priority
          className="hidden h-8 w-8 shrink-0 rounded-full border border-line min-[360px]:block"
        />
        {/* Sized down on phones so the full name fits next to the button. */}
        <span className="font-display truncate text-[15px] leading-none tracking-wide text-ink min-[400px]:text-lg sm:text-2xl">
          THE SCAVENGER NYC
        </span>
      </Link>

      <Link
        href="/gems"
        aria-current={onGems ? "page" : undefined}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-semibold tracking-wider transition sm:gap-2 sm:px-4 sm:text-xs sm:tracking-widest ${
          onGems
            ? "border-accent bg-accent text-bg"
            : "border-accent/60 text-accent hover:border-accent hover:bg-accent hover:text-bg"
        }`}
      >
        <span aria-hidden>🗽</span>
        HIDDEN GEMS
      </Link>
    </header>
  );
}
