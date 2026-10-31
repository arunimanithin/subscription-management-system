import type { InvoiceStatus, PaymentMethod } from "@/types/enums";

/** Response shapes of GET /api/invoices/summary and GET /api/invoices/aging (Member 3). */

export interface StatusBreakdown {
  count: number;
  total: number;
}

export interface MethodBreakdown {
  method: PaymentMethod | string;
  count: number;
  amount: number;
}

export interface MonthlyPoint {
  /** First day of the month, YYYY-MM-DD. */
  month: string;
  billed: number;
  collected: number;
}

/** All figures for ONE currency – currencies are never added together. */
export interface CurrencySummary {
  currency: string;
  /** Total of invoices issued in the period, excluding draft and void. */
  billed: number;
  /** Paid so far against those same invoices. */
  billed_paid: number;
  /** billed_paid / billed (0–1); null when nothing was billed. */
  collection_rate: number | null;
  /** Succeeded payments made in the period. */
  collected: number;
  /** Payments made in the period that were refunded. */
  refunded: number;
  failed_payments: number;
  /** As of today, not limited to the period: balance of open / partially paid / overdue invoices. */
  outstanding: number;
  open_invoice_count: number;
  /** The part of outstanding whose due date has passed. */
  overdue_amount: number;
  overdue_count: number;
  /** Invoices issued in the period, every status present (zeros included). */
  invoices_by_status: Record<InvoiceStatus, StatusBreakdown>;
  payments_by_method: MethodBreakdown[];
  monthly: MonthlyPoint[];
}

export interface FinancialSummary {
  from: string | null;
  to: string | null;
  as_of: string;
  currencies: CurrencySummary[];
}

export const AGING_BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"] as const;
export type AgingBucketName = (typeof AGING_BUCKETS)[number];

export interface AgingBucket {
  bucket: AgingBucketName;
  count: number;
  amount: number;
}

export interface TopOverdueCustomer {
  customer_id: string;
  customer_name: string;
  invoices: number;
  amount: number;
  oldest_days_overdue: number;
}

export interface CurrencyAging {
  currency: string;
  total_outstanding: number;
  total_overdue: number;
  /** Always the five buckets, in order. "current" = not yet due. */
  buckets: AgingBucket[];
  top_overdue_customers: TopOverdueCustomer[];
}

export interface AgingReport {
  as_of: string;
  currencies: CurrencyAging[];
}
