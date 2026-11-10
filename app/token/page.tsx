import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { MarketStats } from "@/components/MarketStats";
import { TokenomicsChart } from "@/components/TokenomicsChart";
import {
  LOCK_TX_SIGNATURE,
  PROJECT_WALLETS,
  SCAV_MINT,
  SCAV_POOL_ID,
  TOKEN_FACTS,
  TOKEN_LINKS,
  getMarketData,
  solscanAccountUrl,
  solscanTxUrl,
} from "@/lib/token";

export const metadata: Metadata = {
  title: "SCAV Token",
  description:
    "Official details for SCAV, the reward token for The Scavenger NYC hunts: mint address, supply, the official pool, and every project wallet.",
};

// Re-render at most once a minute so the first paint has fresh market data.
export const revalidate = 60;

const EXTERNAL_LINKS = [
  { label: "Trade on Raydium", href: TOKEN_LINKS.raydiumSwap },
  { label: "View pool on Raydium", href: TOKEN_LINKS.raydiumPool },
  { label: "View on Dexscreener", href: TOKEN_LINKS.dexscreener },
  { label: "View on Solscan", href: TOKEN_LINKS.solscanToken },
] as const;

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display mb-5 text-3xl leading-none text-ink sm:text-4xl">{children}</h2>;
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline-offset-2 transition hover:underline"
    >
      {children}
    </a>
  );
}

export default async function TokenPage() {
  const market = await getMarketData();

  return (
    <main className="flex-1 bg-bg text-ink">
      <header className="border-b border-line bg-gradient-to-b from-surface to-bg px-6 pb-10 pt-12 text-center sm:pb-14 sm:pt-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <h1 className="font-display text-5xl leading-none sm:text-7xl">SCAV TOKEN</h1>
          <p className="text-balance text-sm text-ink/60 sm:text-base">
            SCAV is the reward token for The Scavenger NYC hunts. This page is the official reference for
            the token, its pool, and every wallet we control.
          </p>
          <Link
            href="/"
            className="text-xs font-medium tracking-widest text-ink/60 transition hover:text-accent"
          >
            ← BACK TO HOME
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-4xl flex-col gap-14 px-6 py-12 sm:gap-16 sm:py-16">
        {/* 1. LIVE MARKET DATA */}
        <section>
          <SectionHeading>MARKET DATA</SectionHeading>
          <MarketStats initial={market} />
          <div className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
            <iframe
              src={TOKEN_LINKS.dexscreenerEmbed}
              title="SCAV/SOL price chart on Dexscreener"
              loading="lazy"
              className="block h-[420px] w-full sm:h-[520px]"
            />
          </div>
        </section>

        {/* 2. TOKEN FACTS */}
        <section>
          <SectionHeading>TOKEN FACTS</SectionHeading>
          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-ink/60">Mint address</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <code className="break-all font-mono text-sm text-ink">{SCAV_MINT}</code>
              <CopyButton value={SCAV_MINT} label="Copy SCAV mint address" />
            </div>
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {TOKEN_FACTS.map((fact) => (
              <div key={fact.label} className="rounded-xl border border-line bg-surface px-5 py-4">
                <dt className="text-[11px] font-medium uppercase tracking-widest text-ink/60">{fact.label}</dt>
                <dd className="mt-1 text-base font-semibold text-ink">{fact.value}</dd>
                {"note" in fact && <dd className="mt-1 text-xs text-ink/60">{fact.note}</dd>}
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-ink/60">
            You can check each of these yourself on{" "}
            <ExternalLink href={TOKEN_LINKS.solscanToken}>Solscan</ExternalLink>.
          </p>
          <p className="mt-2 text-xs text-ink/60">
            Metadata update authority is currently held by the admin wallet so we can finalize branding.
            We plan to revoke it once branding is final.
          </p>
        </section>

        {/* 3. OFFICIAL POOL */}
        <section>
          <SectionHeading>OFFICIAL POOL</SectionHeading>
          <div className="rounded-xl border border-line bg-surface p-5">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-widest text-ink/60">Pool</dt>
                <dd className="mt-1 text-sm text-ink">Raydium Standard AMM (CPMM), SCAV/SOL</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-widest text-ink/60">Fee tier</dt>
                <dd className="mt-1 text-sm text-ink">0.25%</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-medium uppercase tracking-widest text-ink/60">Pool ID</dt>
                <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <code className="break-all font-mono text-sm text-ink">{SCAV_POOL_ID}</code>
                  <CopyButton value={SCAV_POOL_ID} label="Copy pool ID" />
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-medium uppercase tracking-widest text-ink/60">
                  Team liquidity
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  100% permanently locked with Raydium Burn &amp; Earn. The team can never withdraw it.
                </dd>
                <dd className="mt-1 text-xs text-ink/60">
                  Lock transaction:{" "}
                  {LOCK_TX_SIGNATURE ? (
                    <ExternalLink href={solscanTxUrl(LOCK_TX_SIGNATURE)}>View on Solscan</ExternalLink>
                  ) : (
                    <span>link coming soon</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 rounded-xl border border-accent/40 bg-accent/10 px-5 py-4 text-sm text-ink">
            This is the only official SCAV pool. Other pools are not created or controlled by us.
          </p>
        </section>

        {/* 4. TRANSPARENCY */}
        <section>
          <SectionHeading>TRANSPARENCY</SectionHeading>
          <p className="mb-5 text-sm text-ink/60">
            All 1,000,000,000 SCAV were minted once and split across the six wallets below. Every wallet
            is public, so anyone can follow what moves and when.
          </p>
          <TokenomicsChart />
          <h3 className="mb-3 mt-8 text-[11px] font-medium uppercase tracking-widest text-ink/60">
            Project wallets
          </h3>
          <ul className="flex flex-col gap-3">
            {PROJECT_WALLETS.map((w) => (
              <li key={w.address} className="rounded-xl border border-line bg-surface px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{w.label}</span>
                  <span className="text-xs text-ink/60">{w.pct}% of supply at launch</span>
                </div>
                <a
                  href={solscanAccountUrl(w.address)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${w.label} wallet on Solscan`}
                  className="mt-1.5 block break-all font-mono text-xs text-accent underline-offset-2 transition hover:underline"
                >
                  {w.address}
                </a>
                {w.note && <p className="mt-2 text-xs text-ink/60">{w.note}</p>}
              </li>
            ))}
          </ul>
        </section>

        {/* 5. LINKS */}
        <section>
          <SectionHeading>LINKS</SectionHeading>
          <ul className="grid gap-3 sm:grid-cols-2">
            {EXTERNAL_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-line bg-surface px-5 py-4 text-sm font-medium text-ink transition hover:border-accent/60 hover:text-accent"
                >
                  {link.label}
                  <span aria-hidden className="text-accent">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink/60">
            Raydium will show a notice because SCAV is new. Make sure the mint address matches the one on
            this page.
          </p>
        </section>

        {/* 6. DISCLAIMER */}
        <section className="border-t border-line pt-8">
          <h2 className="mb-2 text-[11px] font-medium uppercase tracking-widest text-ink/60">Disclaimer</h2>
          <p className="text-xs leading-relaxed text-ink/60">
            SCAV is a community reward token for The Scavenger NYC hunts. It is not an investment, and we
            make no promise of value or returns. Nothing on this site is financial advice.
          </p>
        </section>
      </div>
    </main>
  );
}
