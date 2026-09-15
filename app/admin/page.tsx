"use client";

import { useEffect, useState } from "react";

type Coin = {
  code: string;
  week: string | null;
  status: "unclaimed" | "claimed";
  reward_amount: number;
  claimed_by: string | null;
  claimed_at: string | null;
  claim_tx: string | null;
  created_at: string;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminPage() {
  const [coins, setCoins] = useState<Coin[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newWeek, setNewWeek] = useState("");
  const [newReward, setNewReward] = useState(500);
  const [createResult, setCreateResult] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [bonusWallet, setBonusWallet] = useState("");
  const [bonusResult, setBonusResult] = useState<string | null>(null);
  const [sendingBonus, setSendingBonus] = useState(false);

  const [expiring, setExpiring] = useState<string | null>(null);

  async function loadCoins() {
    try {
      const res = await fetch("/api/admin/coins");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setCoins(data.coins);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load coins");
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/coins");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setCoins(data.coins);
        setLoadError(null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load coins");
      }
    }
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateResult(null);
    try {
      const res = await fetch("/api/admin/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: newWeek, rewardAmount: newReward }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create code");
      setCreateResult(`Created ${data.coin.code} — ${data.claimUrl}`);
      setNewWeek("");
      await loadCoins();
    } catch (err) {
      setCreateResult(`Error: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleExpire(code: string) {
    if (!confirm(`Mark ${code} as expired? This cannot be undone.`)) return;
    setExpiring(code);
    try {
      const res = await fetch("/api/admin/expire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to expire");
      await loadCoins();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to expire code");
    } finally {
      setExpiring(null);
    }
  }

  async function handleBonus(e: React.FormEvent) {
    e.preventDefault();
    setSendingBonus(true);
    setBonusResult(null);
    try {
      const res = await fetch("/api/admin/bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: bonusWallet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bonus payout failed");
      setBonusResult(`Sent! Tx: ${data.txSignature}`);
      setBonusWallet("");
    } catch (err) {
      setBonusResult(`Error: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setSendingBonus(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] p-6 text-[#F0EDE8] sm:p-10">
      <h1 className="font-display mb-8 text-3xl">SCAV ADMIN</h1>

      <section className="mb-10 grid gap-6 sm:grid-cols-2">
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5"
        >
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-[#F5C518]">
            New claim code
          </h2>
          <label className="mb-3 block text-sm">
            Week label
            <input
              required
              value={newWeek}
              onChange={(e) => setNewWeek(e.target.value)}
              placeholder="hunt-002"
              className="mt-1 w-full rounded-md border border-[#2A2A2A] bg-black/40 px-3 py-2 text-sm"
            />
          </label>
          <label className="mb-4 block text-sm">
            Reward amount (SCAV)
            <input
              required
              type="number"
              min={1}
              value={newReward}
              onChange={(e) => setNewReward(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-[#2A2A2A] bg-black/40 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-[#F5C518] px-4 py-2 text-sm font-semibold text-[#0A0A0A] disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create code"}
          </button>
          {createResult && (
            <p className="mt-3 break-all text-xs text-[#F0EDE8]/70">{createResult}</p>
          )}
        </form>

        <form
          onSubmit={handleBonus}
          className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5"
        >
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-[#F5C518]">
            Send bonus payout (500 SCAV)
          </h2>
          <p className="mb-3 text-xs text-[#F0EDE8]/50">
            Only send after you&apos;ve verified their social media post yourself.
          </p>
          <label className="mb-4 block text-sm">
            Wallet address
            <input
              required
              value={bonusWallet}
              onChange={(e) => setBonusWallet(e.target.value)}
              placeholder="Solana wallet address"
              className="mt-1 w-full rounded-md border border-[#2A2A2A] bg-black/40 px-3 py-2 font-mono text-xs"
            />
          </label>
          <button
            type="submit"
            disabled={sendingBonus}
            className="rounded-md bg-[#F5C518] px-4 py-2 text-sm font-semibold text-[#0A0A0A] disabled:opacity-50"
          >
            {sendingBonus ? "Sending..." : "Send 500 SCAV bonus"}
          </button>
          {bonusResult && (
            <p className="mt-3 break-all text-xs text-[#F0EDE8]/70">{bonusResult}</p>
          )}
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-[#F5C518]">
          All claim codes
        </h2>
        {loadError && <p className="text-sm text-red-400">{loadError}</p>}
        {!coins && !loadError && <p className="text-sm text-[#F0EDE8]/50">Loading...</p>}
        {coins && (
          <div className="overflow-x-auto rounded-xl border border-[#2A2A2A]">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-[#141414] text-[#F0EDE8]/50">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Week</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reward</th>
                  <th className="p-3">Claimed by</th>
                  <th className="p-3">Claimed at</th>
                  <th className="p-3">Tx</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {coins.map((c) => (
                  <tr key={c.code} className="border-t border-[#2A2A2A]">
                    <td className="p-3 font-mono">{c.code}</td>
                    <td className="p-3">{c.week ?? "—"}</td>
                    <td className="p-3">
                      <span
                        className={c.status === "unclaimed" ? "text-[#F5C518]" : "text-[#F0EDE8]/50"}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3">{c.reward_amount.toLocaleString()}</td>
                    <td className="p-3 max-w-[160px] truncate font-mono" title={c.claimed_by ?? ""}>
                      {c.claimed_by ?? "—"}
                    </td>
                    <td className="p-3">{fmtDate(c.claimed_at)}</td>
                    <td className="p-3 max-w-[140px] truncate font-mono" title={c.claim_tx ?? ""}>
                      {c.claim_tx ?? "—"}
                    </td>
                    <td className="p-3">
                      {c.status === "unclaimed" && (
                        <button
                          onClick={() => handleExpire(c.code)}
                          disabled={expiring === c.code}
                          className="rounded border border-red-400/40 px-2 py-1 text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                        >
                          {expiring === c.code ? "..." : "Mark expired"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
