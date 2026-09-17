import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { GoldParticles } from "@/components/GoldParticles";
import { Stars } from "@/components/Stars";
import { DotGrid } from "@/components/DotGrid";
import { CyclingPhrase } from "@/components/CyclingPhrase";
import { SkylineSilhouette } from "@/components/SkylineSilhouette";
import { CountdownTimer } from "@/components/CountdownTimer";
import { TokenomicsChart } from "@/components/TokenomicsChart";
import { currentHunt } from "@/content/current-hunt";

const STEPS = [
  {
    n: "01",
    title: "FOLLOW THE CLUES",
    body: "Every Monday we drop a new clue pointing somewhere in NYC. Follow it, decode it, narrow it down.",
  },
  {
    n: "02",
    title: "FIND THE COIN",
    body: "Somewhere in the city, a physical Scavenger Coin is waiting. Track it down before anyone else does.",
  },
  {
    n: "03",
    title: "CLAIM YOUR $SCAV",
    body: "Scan the QR code on the coin, connect your wallet, and your SCAV arrives in seconds.",
  },
] as const;

const MINT_ADDRESS = process.env.NEXT_PUBLIC_SCAV_MINT_ADDRESS ?? "BfuWHs9zwKvQz85b9RCi8mWuPtmo2ZCpQUtYR49F3zJP";

const SOCIALS = [
  { label: "X", href: "https://x.com/ScavengerCoin" },
  { label: "TikTok", href: "https://tiktok.com/@ScavengerCoin" },
  { label: "Instagram", href: "https://instagram.com/ScavengerCoin" },
] as const;

export default function Home() {
  return (
    <main className="flex-1 bg-[#0A0A0A] text-[#F0EDE8]">
      {/* HERO */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0A0400] via-[#3D1400] to-[#0A0A0A] px-6 text-center">
        <DotGrid />
        <Stars />
        <div
          aria-hidden
          className="gold-glow absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF6B1A] blur-[100px] sm:h-96 sm:w-96"
        />
        <GoldParticles />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <Image
            src="/scav-logo.jpg"
            alt="Scavenger Coin logo"
            width={110}
            height={110}
            className="rounded-full border border-[#2A2A2A]"
            priority
          />
          <h1 className="font-display text-6xl leading-none text-[#F0EDE8] sm:text-8xl">
            THE HUNT IS ON
          </h1>
          <p className="max-w-md text-balance text-base text-[#F0EDE8]/60 sm:max-w-xl sm:text-lg">
            Every week, a physical Scavenger Coin is hidden somewhere in NYC.{" "}
            <CyclingPhrase />
          </p>
          <Link
            href="#how-it-works"
            className="mt-2 rounded-full bg-[#F5C518] px-8 py-3.5 text-sm font-semibold tracking-wide text-[#0A0A0A] transition hover:brightness-110 active:scale-[0.98] sm:text-base"
          >
            Found a coin? Scan it to claim
          </Link>
        </div>

        <SkylineSilhouette />
      </section>

      {/* HOW IT WORKS */}
      <FadeIn>
        <section id="how-it-works" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-20 sm:py-28">
          <h2 className="font-display mb-12 text-center text-4xl text-[#F0EDE8] sm:text-5xl">
            HOW IT WORKS
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-6"
              >
                <div className="font-display mb-4 text-4xl text-[#F5C518]">{step.n}</div>
                <h3 className="mb-2 text-sm font-semibold tracking-wide text-[#F0EDE8]">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#F0EDE8]/60">{step.body}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* CURRENT HUNT — mission dossier */}
      <FadeIn>
        <section className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-6 sm:p-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-[#2A2A2A] pb-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#F5C518]/30 bg-[#F5C518]/10 px-3 py-1 text-xs font-semibold tracking-widest text-[#F5C518]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F5C518]" />
                {currentHunt.status}
              </span>
              <span className="font-mono text-xs tracking-widest text-[#F0EDE8]/40">
                CLUE {currentHunt.weekNumber} WEEK {currentHunt.weekNumber}
              </span>
            </div>

            <p className="mb-2 text-xs uppercase tracking-widest text-[#F0EDE8]/40">
              Current clue
            </p>
            <p className="font-display mb-8 text-2xl leading-tight text-[#F0EDE8] sm:text-3xl">
              &ldquo;{currentHunt.clue}&rdquo;
            </p>

            <p className="mb-3 text-xs uppercase tracking-widest text-[#F0EDE8]/40">
              Next clue drops in
            </p>
            <CountdownTimer />
          </div>
        </section>
      </FadeIn>

      {/* TOKENOMICS */}
      <FadeIn>
        <section className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
          <h2 className="font-display mb-2 text-center text-4xl text-[#F0EDE8] sm:text-5xl">
            TOKENOMICS
          </h2>
          <p className="mb-10 text-center text-sm text-[#F0EDE8]/40">
            1,000,000,000 $SCAV total supply
          </p>
          <TokenomicsChart />
        </section>
      </FadeIn>

      {/* FOOTER */}
      <footer className="border-t border-[#2A2A2A] px-6 py-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <div className="flex gap-6">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium tracking-widest text-[#F0EDE8]/50 transition hover:text-[#F5C518]"
              >
                {s.label}
              </a>
            ))}
          </div>
          <p className="break-all font-mono text-[11px] text-[#F0EDE8]/30">{MINT_ADDRESS}</p>
          <a
            href="mailto:support@scavengercoin.com"
            className="text-xs text-[#F0EDE8]/40 transition hover:text-[#F5C518]"
          >
            Contact us: support@scavengercoin.com
          </a>
          <p className="text-[11px] tracking-widest text-[#F0EDE8]/30">NYC.EST 2025</p>
        </div>
      </footer>
    </main>
  );
}
