/**
 * SHARED CONTRACT – API envelopes, request and response types.
 * Requests are inferred from the Zod schemas (z.input = what the client sends).
 * Endpoint list lives in CONTRACTS.md section 4.
 */
import type { z } from "zod";
import type { ApiErrorCode, BillingInterval, SubscriptionStatus } from "./enums";
import type {
  Customer,
  Invoice,
  InvoiceItem,
  Payment,
  Plan,
  Product,
  Profile,
  Quotation,
  QuotationItem,
  Subscription,
  SubscriptionItem,
} from "./entities";
import type * as S from "./schemas";

/* ---------- envelopes ---------- */

export interface ListMeta {
  page: number;
  page_size: number;
  total: number;
}
export interface ApiOk<T> {
  data: T;
}
export interface ApiList<T> {
  data: T[];
  meta: ListMeta;
}
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}
export type ListQuery = z.input<typeof S.listQuerySchema>;

/* ---------- auth & users ---------- */

export type MeResponse = ApiOk<Profile & { customer_id: string | null }>;
export type UpdateUserRequest = z.input<typeof S.updateUserSchema>;

/* ---------- customers ---------- */

export type CreateCustomerRequest = z.input<typeof S.createCustomerSchema>;
export type UpdateCustomerRequest = z.input<typeof S.updateCustomerSchema>;
export type CustomerResponse = ApiOk<Customer>;
export type CustomerListResponse = ApiList<Customer>;

/* ---------- products & plans ---------- */

export type CreateProductRequest = z.input<typeof S.createProductSchema>;
export type UpdateProductRequest = z.input<typeof S.updateProductSchema>;
export type ProductResponse = ApiOk<Product>;
export type ProductListResponse = ApiList<Product>;

export type CreatePlanRequest = z.input<typeof S.createPlanSchema>;
export type UpdatePlanRequest = z.input<typeof S.updatePlanSchema>;
export type PlanWithProduct = Plan & { product: Pick<Product, "id" | "name"> };
export type PlanResponse = ApiOk<PlanWithProduct>;
export type PlanListResponse = ApiList<PlanWithProduct>;

/* ---------- subscriptions ---------- */

export type LineItemInput = z.input<typeof S.lineItemInputSchema>;
export type CreateSubscriptionRequest = z.input<typeof S.createSubscriptionSchema>;
export type UpdateSubscriptionRequest = z.input<typeof S.updateSubscriptionSchema>;
export type SubscriptionTransitionRequest = z.input<typeof S.subscriptionTransitionSchema>;
export type SubscriptionDetail = Subscription & {
  customer: Pick<Customer, "id" | "name" | "email" | "company">;
  items: SubscriptionItem[];
};
export type SubscriptionResponse = ApiOk<SubscriptionDetail>;
export type SubscriptionListResponse = ApiList<SubscriptionDetail>;

/* ---------- quotations ---------- */

export type CreateQuotationRequest = z.input<typeof S.createQuotationSchema>;
export type UpdateQuotationRequest = z.input<typeof S.updateQuotationSchema>;
export type QuotationTransitionRequest = z.input<typeof S.quotationTransitionSchema>;
export type ConvertQuotationRequest = z.input<typeof S.convertQuotationSchema>;
export type QuotationDetail = Quotation & {
  customer: Pick<Customer, "id" | "name" | "email" | "company">;
  items: QuotationItem[];
};
export type QuotationResponse = ApiOk<QuotationDetail>;
export type QuotationListResponse = ApiList<QuotationDetail>;
/** POST /api/quotations/:id/convert */
export type ConvertQuotationResponse = ApiOk<{
  quotation: Quotation;
  subscription: SubscriptionDetail;
}>;

/* ---------- invoices ---------- */

export type CreateInvoiceRequest = z.input<typeof S.createInvoiceSchema>;
export type UpdateInvoiceRequest = z.input<typeof S.updateInvoiceSchema>;
export type InvoiceTransitionRequest = z.input<typeof S.invoiceTransitionSchema>;
export type GenerateInvoiceRequest = z.input<typeof S.generateInvoiceSchema>;
export type InvoiceDetail = Invoice & {
  customer: Pick<Customer, "id" | "name" | "email" | "company">;
  items: InvoiceItem[];
  payments: Payment[];
};
export type InvoiceResponse = ApiOk<InvoiceDetail>;
export type InvoiceListResponse = ApiList<Invoice & { customer: Pick<Customer, "id" | "name"> }>;
/** POST /api/invoices/mark-overdue */
export type MarkOverdueResponse = ApiOk<{ updated: number }>;

/* ---------- payments ---------- */

export type CreatePaymentRequest = z.input<typeof S.createPaymentSchema>;
export type PaymentResponse = ApiOk<Payment>;
export type PaymentListResponse = ApiList<Payment & { invoice_number: string }>;

/* ---------- dashboard & analytics ---------- */

export interface DashboardSummary {
  currency: string;
  mrr: number;
  arr: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  cancelled_last_30d: number;
  new_customers_last_30d: number;
  revenue_this_month: number; // collected
  revenue_last_month: number;
  outstanding_amount: number; // sum amount_due of open / partially_paid / overdue
  overdue_amount: number;
  overdue_invoice_count: number;
}
export type DashboardSummaryResponse = ApiOk<DashboardSummary>;

export type RevenueQuery = z.input<typeof S.revenueQuerySchema>;
export interface RevenuePoint {
  month: string; // 'YYYY-MM'
  invoiced: number;
  collected: number;
}
export type RevenueResponse = ApiOk<RevenuePoint[]>;

export interface MrrByPlanRow {
  plan_id: string | null;
  plan_name: string;
  subscriptions: number;
  mrr: number;
}
export type MrrByPlanResponse = ApiOk<MrrByPlanRow[]>;

export interface SubscriptionStatusCount {
  status: SubscriptionStatus;
  count: number;
}
export type SubscriptionStatusResponse = ApiOk<SubscriptionStatusCount[]>;

/* ---------- customer portal ---------- */

export interface PortalOverview {
  customer: Customer;
  subscriptions: SubscriptionDetail[];
  invoices: Invoice[];
  payments: Payment[];
  amount_due: number;
}
export type PortalOverviewResponse = ApiOk<PortalOverview>;

/* ---------- misc ---------- */

export interface HealthReport {
  app: "ok";
  checked_at: string;
  env: { supabase_url: boolean; supabase_anon_key: boolean };
  supabase: {
    status: "not_configured" | "unreachable" | "invalid_key" | "schema_missing" | "ready";
    detail: string;
  };
}

export type { BillingInterval };
