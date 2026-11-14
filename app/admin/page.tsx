"use client";

import { useEffect, useState } from "react";
import { parseClaimTx } from "@/lib/claim-status";
import { GemManager } from "@/components/GemManager";

type Coin = {
  code: string;
  week: string | null;
  status: "unclaimed" | "claimed";
  reward_amount: number;
  bonus_amount?: number | null;
  claimed_by: string | null;
  claimed_at: string | null;
  claim_tx: string | null;
  created_at: string;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// Codes created before bonus_amount existed fall back to the old global 500.
function bonusFor(coin: Coin): number {
  return coin.bonus_amount ?? 500;
}

function truncate(s: string, n = 12) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export default function AdminPage() {
  const [coins, setCoins] = useState<Coin[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newWeek, setNewWeek] = useState("");
  const [newReward, setNewReward] = useState(500);
  const [newBonus, setNewBonus] = useState(500);
  const [createResult, setCreateResult] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  async function reload() {
    try {
      const res = await fetch("/api/admin/coins");
      const data = await res.json();
      if (res.ok) setCoins(data.coins);
    } catch {
      // Keep showing the stale list rather than blanking it on a transient error.
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateResult(null);
    try {
      const res = await fetch("/api/admin/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: newWeek, rewardAmount: newReward, bonusAmount: newBonus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create code");
      setCreateResult(`Created ${data.coin.code} — ${data.claimUrl}`);
      setNewWeek("");
      await reload();
    } catch (err) {
      setCreateResult(`Error: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleExpire(code: string) {
    if (!confirm(`Mark ${code} as expired? This cannot be undone.`)) return;
    setBusyCode(code);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/expire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to expire");
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to expire code");
    } finally {
      setBusyCode(null);
    }
  }

  async function handleBonus(code: string, amount: number) {
    if (
      !confirm(
        `Send ${amount.toLocaleString()} SCAV bonus for ${code}? Only do this after verifying their social post.`
      )
    )
      return;
    setBusyCode(code);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bonus payout failed");
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Bonus payout failed");
    } finally {
      setBusyCode(null);
    }
  }

  async function handleResolve(code: string, type: "claim" | "bonus", outcome: "confirmed" | "failed") {
    const label = type === "claim" ? "claim payout" : "bonus payout";
    if (!confirm(`Mark this ${label} as ${outcome}? Double-check the transaction on an explorer first.`)) return;
    setBusyCode(code);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, type, outcome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to resolve");
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to resolve");
    } finally {
      setBusyCode(null);
    }
  }

  const needsReview =
    coins?.filter((c) => {
      const s = parseClaimTx(c.claim_tx);
      return s.claimStatus === "pending_review" || s.bonusStatus === "pending_review";
    }) ?? [];

  return (
    <main className="min-h-screen bg-bg p-6 text-ink sm:p-10">
      <h1 className="font-display mb-8 text-3xl">SCAV ADMIN</h1>

      {needsReview.length > 0 && (
        <div className="mb-8 rounded-xl border border-red-400/50 bg-red-400/10 p-4">
          <p className="text-sm font-semibold text-red-400">
            ⚠ {needsReview.length} payout{needsReview.length > 1 ? "s" : ""} need manual review — scroll
            to the highlighted row{needsReview.length > 1 ? "s" : ""} below.
          </p>
        </div>
      )}

      {actionError && (
        <div className="mb-6 rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-400">
          {actionError}
        </div>
      )}

      <section className="mb-10">
        <form
          onSubmit={handleCreate}
          className="max-w-md rounded-xl border border-line bg-surface p-5"
        >
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-accent">
            New claim code
          </h2>
          <label className="mb-3 block text-sm">
            Week label
            <input
              required
              value={newWeek}
              onChange={(e) => setNewWeek(e.target.value)}
              placeholder="hunt-002"
              className="mt-1 w-full rounded-md border border-ink/40 bg-bg/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="mb-3 block text-sm">
            Reward amount (SCAV), paid on claim
            <input
              required
              type="number"
              min={1}
              step={1}
              value={newReward}
              onChange={(e) => setNewReward(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-ink/40 bg-bg/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="mb-4 block text-sm">
            Bonus amount (SCAV), paid later from this page. 0 for no bonus.
            <input
              required
              type="number"
              min={0}
              step={1}
              value={newBonus}
              onChange={(e) => setNewBonus(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-ink/40 bg-bg/60 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create code"}
          </button>
          {createResult && (
            <p className="mt-3 break-all text-xs text-ink/70">{createResult}</p>
          )}
        </form>
      </section>

      <GemManager />

      <section>
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-accent">
          All claim codes
        </h2>
        {loadError && <p className="text-sm text-red-400">{loadError}</p>}
        {!coins && !loadError && <p className="text-sm text-ink/60">Loading...</p>}
        {coins && (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="bg-surface text-ink/60">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Week</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reward</th>
                  <th className="p-3">Claimed by</th>
                  <th className="p-3">Claimed at</th>
                  <th className="p-3">Bonus</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coins.map((c) => {
                  const state = parseClaimTx(c.claim_tx);
                  const flagged = state.claimStatus === "pending_review" || state.bonusStatus === "pending_review";
                  const canBonus =
                    c.status === "claimed" &&
                    c.claimed_by !== "EXPIRED - no winner" &&
                    state.claimStatus === "confirmed" &&
                    state.bonusStatus === "none" &&
                    bonusFor(c) > 0;

                  return (
                    <tr
                      key={c.code}
                      className={`border-t border-line ${flagged ? "bg-red-400/10" : ""}`}
                    >
                      <td className="p-3 font-mono">{c.code}</td>
                      <td className="p-3">{c.week ?? "—"}</td>
                      <td className="p-3">
                        <span className={c.status === "unclaimed" ? "text-accent" : "text-ink/60"}>
                          {c.status}
                        </span>
                        {state.claimStatus === "pending_review" && (
                          <span className="ml-2 rounded bg-red-400/20 px-1.5 py-0.5 text-red-400">
                            ⚠ payout unconfirmed
                          </span>
                        )}
                      </td>
                      <td className="p-3">{c.reward_amount.toLocaleString()}</td>
                      <td className="p-3 max-w-[160px] truncate font-mono" title={c.claimed_by ?? ""}>
                        {c.claimed_by ?? "—"}
                      </td>
                      <td className="p-3">{fmtDate(c.claimed_at)}</td>
                      <td className="p-3">
                        <span className="mr-2">{bonusFor(c).toLocaleString()}</span>
                        {state.bonusStatus === "none" && (
                          <span className="text-ink/60">{bonusFor(c) > 0 ? "not sent" : "no bonus"}</span>
                        )}
                        {state.bonusStatus === "pending" && <span className="text-accent">sending…</span>}
                        {state.bonusStatus === "sent" && (
                          <span className="text-ink/60" title={state.bonusSig ?? ""}>
                            ✓ sent {truncate(state.bonusSig ?? "")}
                          </span>
                        )}
                        {state.bonusStatus === "pending_review" && (
                          <span className="rounded bg-red-400/20 px-1.5 py-0.5 text-red-400">
                            ⚠ needs review
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {c.status === "unclaimed" && (
                            <button
                              onClick={() => handleExpire(c.code)}
                              disabled={busyCode === c.code}
                              className="rounded border border-red-400/40 px-2 py-1 text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                            >
                              Mark expired
                            </button>
                          )}
                          {canBonus && (
                            <button
                              onClick={() => handleBonus(c.code, bonusFor(c))}
                              disabled={busyCode === c.code}
                              className="rounded border border-accent/40 px-2 py-1 text-accent hover:bg-accent/10 disabled:opacity-50"
                            >
                              Send bonus
                            </button>
                          )}
                          {state.claimStatus === "pending_review" && (
                            <>
                              <button
                                onClick={() => handleResolve(c.code, "claim", "confirmed")}
                                disabled={busyCode === c.code}
                                className="rounded border border-green-400/40 px-2 py-1 text-green-400 hover:bg-green-400/10 disabled:opacity-50"
                              >
                                Mark confirmed
                              </button>
                              <button
                                onClick={() => handleResolve(c.code, "claim", "failed")}
                                disabled={busyCode === c.code}
                                className="rounded border border-red-400/40 px-2 py-1 text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                              >
                                Roll back
                              </button>
                            </>
                          )}
                          {state.bonusStatus === "pending_review" && (
                            <>
                              <button
                                onClick={() => handleResolve(c.code, "bonus", "confirmed")}
                                disabled={busyCode === c.code}
                                className="rounded border border-green-400/40 px-2 py-1 text-green-400 hover:bg-green-400/10 disabled:opacity-50"
                              >
                                Mark bonus sent
                              </button>
                              <button
                                onClick={() => handleResolve(c.code, "bonus", "failed")}
                                disabled={busyCode === c.code}
                                className="rounded border border-red-400/40 px-2 py-1 text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                              >
                                Mark bonus failed
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
