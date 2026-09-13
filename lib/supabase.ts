import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export type CoinRow = {
  code: string;
  week: string | null;
  status: "unclaimed" | "claimed";
  claimed_by: string | null;
  claim_tx: string | null;
  claimed_at: string | null;
  reward_amount: number;
};
