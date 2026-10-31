/**
 * SHARED CONTRACT – database row types (snake_case, identical to column names).
 * API JSON also uses snake_case so no mapping layer is needed.
 * Money columns are numeric(12,2) and arrive from PostgREST as JS numbers.
 * Dates are 'YYYY-MM-DD' strings; timestamps are ISO-8601 strings.
 */
import type {
  BillingInterval,
  CustomerStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  QuotationStatus,
  SubscriptionStatus,
  UserRole,
} from "./enums";

export interface Timestamps {
  created_at: string;
  updated_at: string;
}

export interface Profile extends Timestamps {
  id: string; // = auth.users.id
  email: string | null;
  full_name: string | null;
  role: UserRole;
}

export interface Customer extends Timestamps {
  id: string;
  user_id: string | null; // linked portal login (profiles.id)
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  tax_id: string | null;
  notes: string | null;
  status: CustomerStatus;
  created_by: string | null;
}

export interface Product extends Timestamps {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  is_active: boolean;
  created_by: string | null;
}

export interface Plan extends Timestamps {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_interval: BillingInterval;
  interval_count: number;
  trial_days: number;
  setup_fee: number;
  tax_rate: number; // percent, e.g. 18
  is_active: boolean;
}

/** Fields shared by every priced line (subscription / quotation / invoice items). */
export interface LineItemBase {
  plan_id: string | null;
  product_id: string | null;
  description: string; // snapshot
  quantity: number;
  unit_price: number; // snapshot
  discount_percent: number; // snapshot
  tax_rate: number; // snapshot, percent
  sort_order: number;
}

export interface Subscription extends Timestamps {
  id: string;
  subscription_number: string;
  customer_id: string;
  status: SubscriptionStatus;
  currency: string;
  billing_interval: BillingInterval;
  interval_count: number;
  start_date: string;
  trial_end_date: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_date: string | null;
  cancel_at_period_end: boolean;
  paused_at: string | null;
  cancelled_at: string | null;
  ended_at: string | null;
  notes: string | null;
  created_by: string | null;
}

export interface SubscriptionItem extends LineItemBase, Timestamps {
  id: string;
  subscription_id: string;
}

export interface Quotation extends Timestamps {
  id: string;
  quotation_number: string;
  customer_id: string;
  status: QuotationStatus;
  currency: string;
  valid_until: string | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  notes: string | null;
  terms: string | null;
  subscription_id: string | null; // set when converted
  sent_at: string | null;
  accepted_at: string | null;
  created_by: string | null;
}

export interface AmountedLine {
  discount_amount: number;
  tax_amount: number;
  line_total: number;
}

export interface QuotationItem extends LineItemBase, AmountedLine, Timestamps {
  id: string;
  quotation_id: string;
}

export interface Invoice extends Timestamps {
  id: string;
  invoice_number: string;
  customer_id: string;
  subscription_id: string | null;
  status: InvoiceStatus;
  currency: string;
  issue_date: string;
  due_date: string;
  period_start: string | null;
  period_end: string | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  amount_paid: number; // maintained by DB trigger from succeeded payments
  amount_due: number; // generated column: total - amount_paid
  paid_at: string | null;
  voided_at: string | null;
  notes: string | null;
  created_by: string | null;
}

export interface InvoiceItem extends LineItemBase, AmountedLine, Timestamps {
  id: string;
  invoice_id: string;
}

export interface Payment extends Timestamps {
  id: string;
  invoice_id: string;
  customer_id: string; // forced by DB trigger to match the invoice
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  paid_at: string;
  notes: string | null;
  recorded_by: string | null;
}

/* ---- Read-only analytics views (see migration 6; security_invoker, so RLS applies) ---- */

/** One row per subscription item; aggregate by subscription_id or plan_id. */
export interface SubscriptionItemMrrRow {
  subscription_id: string;
  customer_id: string;
  status: SubscriptionStatus;
  plan_id: string | null;
  currency: string;
  mrr: number;
}

export interface MonthlyRevenueRow {
  month: string; // 'YYYY-MM-01'
  invoiced: number;
  collected: number;
}

export interface OverdueInvoiceRow {
  id: string;
  invoice_number: string;
  customer_id: string;
  subscription_id: string | null;
  status: InvoiceStatus;
  due_date: string;
  total: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  days_overdue: number;
}
