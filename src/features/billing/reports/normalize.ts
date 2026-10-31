import { round2 } from "@/lib/money";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/types/enums";
import {
  AGING_BUCKETS,
  type AgingReport,
  type CurrencyAging,
  type CurrencySummary,
  type FinancialSummary,
  type StatusBreakdown,
} from "./types";

/**
 * The database returns raw aggregates (public.billing_financial_summary / billing_aging).
 * These helpers turn them into the documented API shape: every number rounded to 2 decimals,
 * every status and aging bucket present (zeros included), and the collection rate added.
 * Pure functions, unit-tested without a database.
 */

type Json = Record<string, unknown>;
const n = (v: unknown): number => round2(Number(v ?? 0) || 0);
const int = (v: unknown): number => Math.trunc(Number(v ?? 0) || 0);
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);

export function normalizeSummary(raw: unknown): FinancialSummary {
  const r = (raw ?? {}) as Json;
  return {
    from: (r.from as string | null) ?? null,
    to: (r.to as string | null) ?? null,
    as_of: String(r.as_of ?? ""),
    currencies: arr(r.currencies).map(normalizeCurrencySummary),
  };
}

function normalizeCurrencySummary(c: Json): CurrencySummary {
  const billed = n(c.billed);
  const billedPaid = n(c.billed_paid);
  const rawStatus = (c.invoices_by_status ?? {}) as Record<string, Json>;
  const invoices_by_status = Object.fromEntries(
    INVOICE_STATUSES.map((s): [InvoiceStatus, StatusBreakdown] => [
      s,
      { count: int(rawStatus[s]?.count), total: n(rawStatus[s]?.total) },
    ]),
  ) as Record<InvoiceStatus, StatusBreakdown>;

  return {
    currency: String(c.currency),
    billed,
    billed_paid: billedPaid,
    collection_rate: billed > 0 ? Math.round((billedPaid / billed) * 10000) / 10000 : null,
    collected: n(c.collected),
    refunded: n(c.refunded),
    failed_payments: int(c.failed_payments),
    outstanding: n(c.outstanding),
    open_invoice_count: int(c.open_invoice_count),
    overdue_amount: n(c.overdue_amount),
    overdue_count: int(c.overdue_count),
    invoices_by_status,
    payments_by_method: arr(c.payments_by_method).map((m) => ({ method: String(m.method), count: int(m.count), amount: n(m.amount) })),
    monthly: arr(c.monthly).map((m) => ({ month: String(m.month), billed: n(m.billed), collected: n(m.collected) })),
  };
}

export function normalizeAging(raw: unknown): AgingReport {
  const r = (raw ?? {}) as Json;
  return { as_of: String(r.as_of ?? ""), currencies: arr(r.currencies).map(normalizeCurrencyAging) };
}

function normalizeCurrencyAging(c: Json): CurrencyAging {
  const byName = new Map(arr(c.buckets).map((b) => [String(b.bucket), b]));
  return {
    currency: String(c.currency),
    total_outstanding: n(c.total_outstanding),
    total_overdue: n(c.total_overdue),
    buckets: AGING_BUCKETS.map((bucket) => ({ bucket, count: int(byName.get(bucket)?.count), amount: n(byName.get(bucket)?.amount) })),
    top_overdue_customers: arr(c.top_overdue_customers).map((t) => ({
      customer_id: String(t.customer_id),
      customer_name: String(t.customer_name ?? "—"),
      invoices: int(t.invoices),
      amount: n(t.amount),
      oldest_days_overdue: int(t.oldest_days_overdue),
    })),
  };
}
