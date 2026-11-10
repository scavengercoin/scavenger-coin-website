// Single source of truth for the /token page. Every value here was checked
// against mainnet (mint account, Metaplex metadata, Raydium pool account)
// before it was published. Re-verify before editing.

export const SCAV_MINT = "BfuWHs9zwKvQz85b9RCi8mWuPtmo2ZCpQUtYR49F3zJP";
export const SCAV_POOL_ID = "8G8YwRt1ov7AQnnoG1x7cUyonGLSbuz7enPmSzXHoEaf";

// The Burn & Earn lock transaction (liquidity wallet -> Raydium lock program,
// 2026-11-10). If this is ever empty the page shows a "link coming soon" placeholder.
export const LOCK_TX_SIGNATURE =
  "61SVMu18zkjq6iXW3SzdnEfQuZn1kmRdHBf7D6tJYysdJidLB4X7pq3SvBbM4DZ8g8xhufj2iCoEA1d8x4VXKhzG";

export const TOKEN_FACTS = [
  { label: "Name", value: "Scavenger Coin" },
  { label: "Symbol", value: "SCAV (Solana)" },
  { label: "Total supply", value: "1,000,000,000" },
  { label: "Decimals", value: "9" },
  { label: "Mint authority", value: "Revoked", note: "No new SCAV can ever be created." },
  { label: "Freeze authority", value: "Disabled", note: "No wallet's SCAV can be frozen." },
] as const;

export const PROJECT_WALLETS: readonly { label: string; pct: number; address: string; note?: string }[] = [
  {
    label: "Liquidity",
    pct: 30,
    address: "HtfDw5HeL7xmPzvnPAMSuwvWMknHyNK8nfEKufReTSKx",
    note: "300,000,000 allocated: 50,000,000 in the locked pool, 250,000,000 held in reserve.",
  },
  { label: "Founder", pct: 20, address: "G1Jtt4uGQo4JwzZ412nd1tNFBDq3ZPhoAh84RMD5dp6c" },
  { label: "Hunt Pool", pct: 15, address: "EEzmuZvUHrQqnAB2zZg8gByMfyyCgiSX24gXURkeLnV9" },
  { label: "Marketing", pct: 15, address: "9Yr2mH5UKdVeZmmZ4xzFTAunHxjJTxSWXDo3L7ty2gnm" },
  { label: "Community", pct: 15, address: "Box1DDYRs261Yxi8aajEGNRoDgyQsGFwdcfm8yKqpKaE" },
  { label: "Treasury", pct: 5, address: "8fr8L7MbaGastD1QFz1XpBULyCCfmDx7NYcoatVgW4ku" },
];

export const solscanAccountUrl = (address: string) => `https://solscan.io/account/${address}`;
export const solscanTxUrl = (signature: string) => `https://solscan.io/tx/${signature}`;

export const TOKEN_LINKS = {
  raydiumSwap: `https://raydium.io/swap/?inputMint=sol&outputMint=${SCAV_MINT}`,
  raydiumPool: `https://raydium.io/liquidity-pools/?token=${SCAV_MINT}`,
  dexscreener: `https://dexscreener.com/solana/${SCAV_POOL_ID}`,
  dexscreenerEmbed: `https://dexscreener.com/solana/${SCAV_POOL_ID}?embed=1&theme=dark&trades=0&info=0`,
  solscanToken: `https://solscan.io/token/${SCAV_MINT}`,
} as const;

export type MarketData = {
  priceUsd: number;
  liquidityUsd: number | null;
  fdv: number | null;
  volume24h: number | null;
  change24h: number | null;
  fetchedAt: string;
};

const DEXSCREENER_PAIR_API = `https://api.dexscreener.com/latest/dex/pairs/solana/${SCAV_POOL_ID}`;

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/**
 * Live pair stats from Dexscreener's public API. The fetch is cached for 60
 * seconds, so however many people load the page we call Dexscreener at most
 * once a minute. Returns null (never throws) when the API is down or the
 * response isn't the shape we expect, so the page can say "data unavailable".
 */
export async function getMarketData(): Promise<MarketData | null> {
  try {
    const res = await fetch(DEXSCREENER_PAIR_API, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { pair?: Record<string, unknown>; pairs?: Record<string, unknown>[] };
    const pair = (body.pair ?? body.pairs?.[0]) as
      | {
          pairAddress?: string;
          priceUsd?: unknown;
          fdv?: unknown;
          liquidity?: { usd?: unknown };
          volume?: { h24?: unknown };
          priceChange?: { h24?: unknown };
        }
      | undefined;
    // Only ever report the official pool, never some other pair the API returns.
    if (!pair || pair.pairAddress !== SCAV_POOL_ID) return null;
    const priceUsd = num(pair.priceUsd);
    if (priceUsd === null || priceUsd <= 0) return null;
    return {
      priceUsd,
      liquidityUsd: num(pair.liquidity?.usd),
      fdv: num(pair.fdv),
      volume24h: num(pair.volume?.h24),
      change24h: num(pair.priceChange?.h24),
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Dexscreener market data fetch failed:", err);
    return null;
  }
}
