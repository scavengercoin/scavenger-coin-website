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
    title: "EXPLORE THE NEIGHBORHOOD",
    body: "Every Saturday we spotlight a new NYC neighborhood. Explore it, find the spots, and hunt down the coin.",
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
    <main className="flex-1 bg-bg text-ink">
      {/* HERO */}
      <section className="relative flex min-h-[calc(100svh-5.75rem)] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-bg via-surface to-bg px-6 text-center">
        <DotGrid />
        <Stars />
        <div
          aria-hidden
          className="gold-glow absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent blur-[100px] sm:h-96 sm:w-96"
        />
        <GoldParticles />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <Image
            src="/scav-logo.jpg"
            alt="The Scavenger NYC logo"
            width={110}
            height={110}
            className="rounded-full border border-line"
            priority
          />
          <h1 className="font-display text-6xl leading-none text-ink sm:text-8xl">
            THIS WEEK: {currentHunt.neighborhood.toUpperCase()}
          </h1>
          <p className="max-w-md text-balance text-base text-ink/60 sm:max-w-xl sm:text-lg">
            Every week, a physical Scavenger Coin is hidden somewhere in NYC.{" "}
            <CyclingPhrase />
          </p>
          <Link
            href="#how-it-works"
            className="mt-2 rounded-full bg-accent px-8 py-3.5 text-sm font-semibold tracking-wide text-bg transition hover:brightness-110 active:scale-[0.98] sm:text-base"
          >
            Found a coin? Scan it to claim
          </Link>
        </div>

        <SkylineSilhouette />
      </section>

      {/* HOW IT WORKS */}
      <FadeIn>
        <section id="how-it-works" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-20 sm:py-28">
          <h2 className="font-display mb-12 text-center text-4xl text-ink sm:text-5xl">
            HOW IT WORKS
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="rounded-xl border border-line bg-surface p-6"
              >
                <div className="font-display mb-4 text-4xl text-accent">{step.n}</div>
                <h3 className="mb-2 text-sm font-semibold tracking-wide text-ink">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink/60">{step.body}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* CURRENT SPOTLIGHT — mission dossier */}
      <FadeIn>
        <section className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-line pb-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold tracking-widest text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {currentHunt.status}
              </span>
            </div>

            <p className="mb-2 text-xs uppercase tracking-widest text-ink/60">
              This week&apos;s neighborhood
            </p>
            <p className="font-display mb-8 text-2xl leading-tight text-ink sm:text-3xl">
              {currentHunt.neighborhood}
            </p>

            <p className="mb-3 text-xs uppercase tracking-widest text-ink/60">
              Coin drops in
            </p>
            <CountdownTimer dropsAt={currentHunt.dropsAt} />
          </div>
        </section>
      </FadeIn>

      {/* TOKENOMICS */}
      <FadeIn>
        <section className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
          <h2 className="font-display mb-2 text-center text-4xl text-ink sm:text-5xl">
            TOKENOMICS
          </h2>
          <p className="mb-10 text-center text-sm text-ink/60">
            1,000,000,000 $SCAV total supply
          </p>
          <TokenomicsChart />
        </section>
      </FadeIn>

      {/* FOOTER */}
      <footer className="border-t border-line px-6 py-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <div className="flex gap-6">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium tracking-widest text-ink/60 transition hover:text-accent"
              >
                {s.label}
              </a>
            ))}
          </div>
          <Link
            href="/gems"
            className="text-xs font-medium tracking-widest text-ink/60 transition hover:text-accent"
          >
            HIDDEN GEMS
          </Link>
          <Link
            href="/token"
            className="text-xs font-medium tracking-widest text-ink/60 transition hover:text-accent"
          >
            SCAV TOKEN
          </Link>
          <p className="break-all font-mono text-[11px] text-ink/60">{MINT_ADDRESS}</p>
          <a
            href="mailto:support@scavengercoin.com"
            className="text-xs text-ink/60 transition hover:text-accent"
          >
            Contact us: support@scavengercoin.com
          </a>
          <p className="text-[11px] tracking-widest text-ink/60">NYC.EST 2025</p>
        </div>
      </footer>
    </main>
  );
}
