import type { SupabaseClient } from "@supabase/supabase-js";
import { todayISO } from "@/lib/billing-period";
import type { InvoiceDetail } from "@/types/api";
import type { Subscription, SubscriptionItem } from "@/types/entities";
import { getInvoice } from "@/features/billing/invoices/service";
import { BILLABLE_STATUSES, planBilling, type SkipReason } from "./plan";

type DbError = { code?: string; message: string };

export type GenerateResult =
  | { ok: true; invoice: InvoiceDetail; replayed: boolean }
  | { ok: false; kind: "skipped"; reason: SkipReason; message: string }
  | { ok: false; kind: "error"; error: DbError };

async function loadSubscription(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, items:subscription_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error };
  if (!data) return { error: { code: "PGRST116", message: "Subscription not found" } };
  const { items, ...sub } = data as Subscription & { items: SubscriptionItem[] };
  return { sub: sub as Subscription, items: items ?? [] };
}

/**
 * Bills ONE period of ONE subscription: plans the period and amounts (planBilling, pure), then
 * public.generate_subscription_invoice creates the invoice and advances the subscription's
 * billing dates in a single transaction. Idempotent per period.
 */
export async function generateInvoiceForSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
  issueDate: string = todayISO(),
): Promise<GenerateResult> {
  const loaded = await loadSubscription(supabase, subscriptionId);
  if ("error" in loaded && loaded.error) return { ok: false, kind: "error", error: loaded.error };
  const { sub, items } = loaded as { sub: Subscription; items: SubscriptionItem[] };

  const plan = planBilling(sub, items, issueDate);
  if (!plan.ok) return { ok: false, kind: "skipped", reason: plan.reason, message: plan.message };

  const { data, error } = await supabase.rpc("generate_subscription_invoice", {
    p_subscription_id: sub.id,
    p_period_start: plan.period_start,
    p_period_end: plan.period_end,
    p_next_billing: plan.next_billing_date,
    p_invoice: plan.payload.invoice,
    p_items: plan.payload.items,
  });
  if (error) return { ok: false, kind: "error", error };

  const { invoice_id, replayed } = data as { invoice_id: string; replayed: boolean };
  const invoice = await getInvoice(supabase, invoice_id);
  if (invoice.error) return { ok: false, kind: "error", error: invoice.error };
  return { ok: true, invoice: invoice.data, replayed };
}

export interface RunLine {
  subscription_id: string;
  subscription_number: string;
  outcome: "created" | "replayed" | "skipped" | "failed";
  invoice_id?: string;
  invoice_number?: string;
  reason?: string;
}

export interface RunSummary {
  issue_date: string;
  processed: number;
  created: number;
  skipped: number;
  failed: number;
  results: RunLine[];
}

const RUN_LIMIT = 200;

/**
 * Recurring billing run: bills every active / past_due subscription whose billing date has
 * arrived (one period each). Safe to repeat: already-billed periods are not billed again.
 * Each subscription is independent, so one failure never blocks the others.
 */
export async function runRecurringBilling(
  supabase: SupabaseClient,
  issueDate: string = todayISO(),
): Promise<{ data: RunSummary; error: null } | { data: null; error: DbError }> {
  const { data: due, error } = await supabase
    .from("subscriptions")
    .select("id, subscription_number")
    .in("status", [...BILLABLE_STATUSES])
    .or(`next_billing_date.is.null,next_billing_date.lte.${issueDate}`)
    .order("next_billing_date", { ascending: true, nullsFirst: true })
    .limit(RUN_LIMIT);
  if (error) return { data: null, error };

  const results: RunLine[] = [];
  for (const row of (due ?? []) as { id: string; subscription_number: string }[]) {
    const base = { subscription_id: row.id, subscription_number: row.subscription_number };
    const r = await generateInvoiceForSubscription(supabase, row.id, issueDate);
    if (r.ok) {
      results.push({
        ...base,
        outcome: r.replayed ? "replayed" : "created",
        invoice_id: r.invoice.id,
        invoice_number: r.invoice.invoice_number,
      });
    } else if (r.kind === "skipped") {
      results.push({ ...base, outcome: "skipped", reason: r.message });
    } else {
      results.push({ ...base, outcome: "failed", reason: r.error.message });
    }
  }
  return {
    data: {
      issue_date: issueDate,
      processed: results.length,
      created: results.filter((r) => r.outcome === "created").length,
      skipped: results.filter((r) => r.outcome === "skipped").length,
      failed: results.filter((r) => r.outcome === "failed").length,
      results,
    },
    error: null,
  };
}
