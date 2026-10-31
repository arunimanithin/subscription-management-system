/**
 * SHARED CONTRACT – Zod schemas for API request bodies / query strings.
 * Use the same schema in the route handler (server) and in React Hook Form (client).
 */
import { z } from "zod";
import {
  BILLING_INTERVALS,
  INVOICE_ACTIONS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  QUOTATION_ACTIONS,
  SUBSCRIPTION_ACTIONS,
  USER_ROLES,
} from "./enums";

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const money = z.number().min(0);
const percent = z.number().min(0).max(100);
const currency = z.string().length(3).toUpperCase();
const optionalText = z.string().trim().max(2000).nullish();

/* ---------- common ---------- */

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.string().trim().max(30).optional(),
});

/* ---------- users (Member 1) ---------- */

export const updateUserSchema = z.object({
  full_name: z.string().trim().min(1).max(200).optional(),
  role: z.enum(USER_ROLES).optional(),
});

/* ---------- customers (Member 1) ---------- */

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().nullish(),
  phone: z.string().trim().max(30).nullish(),
  company: z.string().trim().max(200).nullish(),
  address_line1: z.string().trim().max(200).nullish(),
  address_line2: z.string().trim().max(200).nullish(),
  city: z.string().trim().max(100).nullish(),
  state: z.string().trim().max(100).nullish(),
  postal_code: z.string().trim().max(20).nullish(),
  country: z.string().trim().length(2).default("IN"),
  tax_id: z.string().trim().max(50).nullish(),
  notes: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
  user_id: uuid.nullish(),
});
export const updateCustomerSchema = createCustomerSchema.partial();

/* ---------- products & plans (Member 1) ---------- */

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(60).nullish(),
  description: optionalText,
  category: z.string().trim().max(100).nullish(),
  is_active: z.boolean().default(true),
});
export const updateProductSchema = createProductSchema.partial();

export const createPlanSchema = z.object({
  product_id: uuid,
  name: z.string().trim().min(1).max(200),
  description: optionalText,
  price: money,
  currency: currency.default("INR"),
  billing_interval: z.enum(BILLING_INTERVALS).default("month"),
  interval_count: z.number().int().min(1).max(36).default(1),
  trial_days: z.number().int().min(0).max(365).default(0),
  setup_fee: money.default(0),
  tax_rate: percent.default(0),
  is_active: z.boolean().default(true),
});
export const updatePlanSchema = createPlanSchema.partial();

/* ---------- line items (shared by subscriptions, quotations, invoices) ---------- */

export const lineItemInputSchema = z.object({
  plan_id: uuid.nullish(),
  product_id: uuid.nullish(),
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive().max(100000),
  unit_price: money,
  discount_percent: percent.default(0),
  tax_rate: percent.default(0),
});

/* ---------- subscriptions (Member 2) ---------- */

export const createSubscriptionSchema = z.object({
  customer_id: uuid,
  currency: currency.default("INR"),
  billing_interval: z.enum(BILLING_INTERVALS).default("month"),
  interval_count: z.number().int().min(1).max(36).default(1),
  start_date: isoDate,
  trial_days: z.number().int().min(0).max(365).default(0),
  notes: optionalText,
  items: z.array(lineItemInputSchema).min(1),
});
export const updateSubscriptionSchema = z.object({
  notes: optionalText,
  cancel_at_period_end: z.boolean().optional(),
  items: z.array(lineItemInputSchema).min(1).optional(),
});
export const subscriptionTransitionSchema = z.object({
  action: z.enum(SUBSCRIPTION_ACTIONS),
  /** cancel only: true = stop at period end, false = cancel immediately */
  at_period_end: z.boolean().default(false),
});

/* ---------- quotations (Member 2) ---------- */

export const createQuotationSchema = z.object({
  customer_id: uuid,
  currency: currency.default("INR"),
  valid_until: isoDate.nullish(),
  notes: optionalText,
  terms: optionalText,
  items: z.array(lineItemInputSchema).min(1),
});
export const updateQuotationSchema = createQuotationSchema.partial();
export const quotationTransitionSchema = z.object({ action: z.enum(QUOTATION_ACTIONS) });
export const convertQuotationSchema = z.object({
  start_date: isoDate,
  billing_interval: z.enum(BILLING_INTERVALS).default("month"),
  interval_count: z.number().int().min(1).max(36).default(1),
});

/* ---------- invoices (Member 3) ---------- */

export const createInvoiceSchema = z.object({
  customer_id: uuid,
  subscription_id: uuid.nullish(),
  currency: currency.default("INR"),
  issue_date: isoDate,
  due_date: isoDate,
  period_start: isoDate.nullish(),
  period_end: isoDate.nullish(),
  notes: optionalText,
  items: z.array(lineItemInputSchema).min(1),
});
export const updateInvoiceSchema = createInvoiceSchema.partial(); // draft invoices only
export const invoiceTransitionSchema = z.object({ action: z.enum(INVOICE_ACTIONS) });
export const generateInvoiceSchema = z.object({
  subscription_id: uuid,
  issue_date: isoDate.optional(), // defaults to today
});

/* ---------- payments (Member 3) ---------- */

export const createPaymentSchema = z.object({
  invoice_id: uuid,
  amount: z.number().positive(),
  method: z.enum(PAYMENT_METHODS),
  status: z.enum(PAYMENT_STATUSES).default("succeeded"),
  reference: z.string().trim().max(200).nullish(),
  paid_at: z.string().datetime().optional(),
  notes: optionalText,
});

/* ---------- analytics (Member 4) ---------- */

export const revenueQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});
