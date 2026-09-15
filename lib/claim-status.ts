/**
 * `coins.claim_tx` packs both the automatic-claim payout state AND the
 * bonus payout state into one text column, so both can be tracked without
 * a Supabase schema migration. Format:
 *
 *   null                                   — never paid out
 *   "<claimSig>"                           — claim confirmed, no bonus yet
 *   "PENDING_REVIEW:<claimSig>"            — claim payout unconfirmed
 *   "<claimSig> BONUS_PENDING"             — bonus payout in flight
 *   "<claimSig> BONUS_PENDING_REVIEW:<sig>"— bonus payout unconfirmed
 *   "<claimSig> BONUS:<bonusSig>"          — bonus confirmed
 *
 * All parsing goes through this file so the encoding only needs to be
 * right in one place.
 */

export type ClaimTxState = {
  claimStatus: "none" | "pending_review" | "confirmed";
  claimSig: string | null;
  bonusStatus: "none" | "pending" | "pending_review" | "sent";
  bonusSig: string | null;
};

export function parseClaimTx(claimTx: string | null): ClaimTxState {
  if (!claimTx) {
    return { claimStatus: "none", claimSig: null, bonusStatus: "none", bonusSig: null };
  }

  if (claimTx.startsWith("PENDING_REVIEW:")) {
    return {
      claimStatus: "pending_review",
      claimSig: claimTx.slice("PENDING_REVIEW:".length),
      bonusStatus: "none",
      bonusSig: null,
    };
  }

  const [claimSig, bonusPart] = claimTx.split(" ");

  if (!bonusPart) {
    return { claimStatus: "confirmed", claimSig, bonusStatus: "none", bonusSig: null };
  }
  if (bonusPart === "BONUS_PENDING") {
    return { claimStatus: "confirmed", claimSig, bonusStatus: "pending", bonusSig: null };
  }
  if (bonusPart.startsWith("BONUS_PENDING_REVIEW:")) {
    return {
      claimStatus: "confirmed",
      claimSig,
      bonusStatus: "pending_review",
      bonusSig: bonusPart.slice("BONUS_PENDING_REVIEW:".length),
    };
  }
  if (bonusPart.startsWith("BONUS:")) {
    return {
      claimStatus: "confirmed",
      claimSig,
      bonusStatus: "sent",
      bonusSig: bonusPart.slice("BONUS:".length),
    };
  }
  return { claimStatus: "confirmed", claimSig, bonusStatus: "none", bonusSig: null };
}

export function withBonusPending(claimTx: string): string {
  return `${claimTx} BONUS_PENDING`;
}

export function withBonusSent(claimSig: string, bonusSig: string): string {
  return `${claimSig} BONUS:${bonusSig}`;
}

export function withBonusPendingReview(claimSig: string, bonusSig: string): string {
  return `${claimSig} BONUS_PENDING_REVIEW:${bonusSig}`;
}
