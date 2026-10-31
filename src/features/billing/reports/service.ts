import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAging, normalizeSummary } from "./normalize";
import type { AgingReport, FinancialSummary } from "./types";

type DbError = { code?: string; message: string };
type Result<T> = { data: T; error: null } | { data: null; error: DbError };

/**
 * Financial summary for invoices issued / payments made between `from` and `to` (inclusive, both
 * optional = unbounded). Outstanding / overdue figures are always "as of today".
 * The sums run inside Postgres (public.billing_financial_summary), so they are exact for any
 * number of rows and respect the caller's row level security.
 */
export async function getFinancialSummary(
  supabase: SupabaseClient,
  params: { from?: string; to?: string } = {},
): Promise<Result<FinancialSummary>> {
  const { data, error } = await supabase.rpc("billing_financial_summary", {
    p_from: params.from ?? null,
    p_to: params.to ?? null,
  });
  if (error) return { data: null, error };
  return { data: normalizeSummary(data), error: null };
}

/** Receivables aging: open balances bucketed by days past due, plus the top overdue customers. */
export async function getAgingReport(supabase: SupabaseClient, params: { as_of?: string } = {}): Promise<Result<AgingReport>> {
  const { data, error } = await supabase.rpc("billing_aging", { p_as_of: params.as_of ?? null });
  if (error) return { data: null, error };
  return { data: normalizeAging(data), error: null };
}
