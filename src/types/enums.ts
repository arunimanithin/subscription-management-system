/**
 * SHARED CONTRACT – status enums and constant lists.
 * Every value here MUST match a CHECK constraint in supabase/migrations.
 * Change only via a PR to main (lead). Add values, never rename or remove.
 */

export const USER_ROLES = ["admin", "staff", "customer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CUSTOMER_STATUSES = ["active", "inactive"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const BILLING_INTERVALS = ["week", "month", "quarter", "year"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUBSCRIPTION_STATUSES = [
  "draft",
  "trialing",
  "active",
  "paused",
  "past_due",
  "cancelled",
  "expired",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_ACTIONS = ["activate", "pause", "resume", "cancel"] as const;
export type SubscriptionAction = (typeof SUBSCRIPTION_ACTIONS)[number];

export const QUOTATION_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "converted",
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_ACTIONS = ["send", "accept", "reject"] as const;
export type QuotationAction = (typeof QUOTATION_ACTIONS)[number];

export const INVOICE_STATUSES = [
  "draft",
  "open",
  "partially_paid",
  "paid",
  "overdue",
  "void",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_ACTIONS = ["issue", "void"] as const;
export type InvoiceAction = (typeof INVOICE_ACTIONS)[number];

export const PAYMENT_STATUSES = ["pending", "succeeded", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["card", "upi", "bank_transfer", "cash", "cheque", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const API_ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "CONFLICT",
  "INVALID_STATE",
  "NOT_IMPLEMENTED",
  "INTERNAL_ERROR",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
