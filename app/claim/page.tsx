"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import confetti from "canvas-confetti";
import { InfoPanel } from "@/components/InfoPanel";

type Lookup =
  | { state: "checking" }
  | { state: "no-code" }
  | { state: "unknown" }
  | { state: "claimed"; claimedAt: string | null }
  | { state: "unclaimed"; amount: number };

type ClaimResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; amount: number; txSignature: string }
  | { status: "error"; message: string };

function fireGoldConfetti() {
  const colors = ["#F5C518", "#F5E4A8", "#D4A017"];
  confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors });
  setTimeout(
    () => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 }, colors }),
    250
  );
}

function ClaimFlow({ code }: { code: string }) {
  const { publicKey, connected } = useWallet();
  const [lookup, setLookup] = useState<Lookup>(() =>
    code ? { state: "checking" } : { state: "no-code" }
  );
  const [result, setResult] = useState<ClaimResult>({ status: "idle" });
  const firedConfetti = useRef(false);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    fetch(`/api/claim?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.status === "unknown") setLookup({ state: "unknown" });
        else if (data.status === "claimed") setLookup({ state: "claimed", claimedAt: data.claimedAt });
        else setLookup({ state: "unclaimed", amount: data.amount ?? 1000 });
      })
      .catch(() => !cancelled && setLookup({ state: "unknown" }));
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (result.status === "success" && !firedConfetti.current) {
      firedConfetti.current = true;
      fireGoldConfetti();
    }
  }, [result]);

  async function handleClaim() {
    if (!publicKey || !code) return;
    setResult({ status: "loading" });
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, wallet: publicKey.toBase58() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ status: "error", message: data.error ?? "Claim failed" });
        return;
      }
      setResult({ status: "success", amount: data.amount, txSignature: data.txSignature });
    } catch {
      setResult({ status: "error", message: "Network error, please try again" });
    }
  }

  // --- Success: full screen reveal ---
  if (result.status === "success") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="font-display text-3xl text-[#F5C518] sm:text-4xl">CLAIM CONFIRMED</p>
        <p className="font-display text-5xl leading-none text-[#F0EDE8] sm:text-7xl">
          {result.amount.toLocaleString()} SCAV CLAIMED
        </p>
        <a
          href={`https://explorer.solana.com/tx/${result.txSignature}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#F5C518]/40 bg-[#F5C518]/10 px-4 py-2 font-mono text-xs text-[#F5C518]"
        >
          View transaction ↗
        </a>
      </div>
    );
  }

  // --- No code in URL ---
  if (lookup.state === "no-code") {
    return (
      <div className="text-center">
        <p className="font-display text-3xl text-[#F0EDE8] sm:text-4xl">NO COIN SCANNED</p>
        <p className="mx-auto mt-3 max-w-xs text-sm text-[#F0EDE8]/50">
          Scan the QR code on the coin you found to load your claim link.
        </p>
      </div>
    );
  }

  // --- Still checking the code ---
  if (lookup.state === "checking") {
    return (
      <div className="pulse-ring h-16 w-16 rounded-full border-2 border-[#F5C518]/60" />
    );
  }

  // --- Unknown code ---
  if (lookup.state === "unknown") {
    return (
      <div className="text-center">
        <p className="font-display text-3xl text-[#F0EDE8] sm:text-4xl">COIN NOT RECOGNIZED</p>
        <p className="mx-auto mt-3 max-w-xs text-sm text-[#F0EDE8]/50">
          This code doesn&apos;t match a coin in this week&apos;s hunt. Double-check the
          QR code, or reach out if you think this is a mistake.
        </p>
      </div>
    );
  }

  // --- Already claimed ---
  if (lookup.state === "claimed") {
    const date = lookup.claimedAt
      ? new Date(lookup.claimedAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;
    return (
      <div className="text-center">
        <p className="font-display text-3xl text-[#F0EDE8] sm:text-4xl">
          THIS COIN HAS BEEN CLAIMED
        </p>
        {date && <p className="mt-3 text-sm text-[#F0EDE8]/50">Claimed on {date}</p>}
      </div>
    );
  }

  // --- Valid, unclaimed: the reveal ---
  return (
    <div className="flex w-full flex-col items-center gap-8 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="pulse-ring absolute inset-0 rounded-full border-2 border-[#F5C518]/60" />
        <div className="relative h-[80%] w-[80%] overflow-hidden rounded-full">
          <Image src="/scav-logo.jpg" alt="Scavenger Coin logo" fill className="object-cover" />
        </div>
      </div>

      <div>
        <p className="font-display text-4xl text-[#F0EDE8] sm:text-6xl">COIN FOUND</p>
        <p className="mt-3 font-mono text-sm tracking-[0.3em] text-[#F5C518] sm:text-base">
          SN·{code.toUpperCase()}
        </p>
        <p className="mt-1 text-xs text-[#F0EDE8]/40">
          Worth {lookup.amount.toLocaleString()} $SCAV
        </p>
      </div>

      {!connected && (
        <div className="[&_.wallet-adapter-button]:bg-[#F5C518]! [&_.wallet-adapter-button]:text-[#0A0A0A]! [&_.wallet-adapter-button]:text-base! [&_.wallet-adapter-button]:px-8! [&_.wallet-adapter-button]:py-4! [&_.wallet-adapter-button]:font-semibold!">
          <WalletMultiButton />
        </div>
      )}

      {connected && (
        <button
          onClick={handleClaim}
          disabled={result.status === "loading"}
          className="rounded-full bg-[#F5C518] px-10 py-4 text-base font-semibold text-[#0A0A0A] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {result.status === "loading" ? "Claiming..." : "Claim $SCAV"}
        </button>
      )}

      {result.status === "error" && (
        <p className="max-w-xs text-sm text-red-400">{result.message}</p>
      )}

      <InfoPanel />
    </div>
  );
}

function ClaimFlowRoute() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code")?.trim() ?? "";
  // Keying on the code means a changed URL param remounts with fresh state
  // instead of needing an effect to manually reset it.
  return <ClaimFlow key={code} code={code} />;
}

export default function ClaimPage() {
  return (
    <main className="flex min-h-[100svh] flex-1 flex-col items-center justify-center bg-[#0A0A0A] px-6 py-16 text-[#F0EDE8]">
      <Suspense fallback={null}>
        <ClaimFlowRoute />
      </Suspense>
    </main>
  );
}
