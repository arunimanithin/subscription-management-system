import { calcLine, calcTotals, type DocumentTotals } from "@/lib/money";
import type { CreateInvoiceInput, UpdateInvoiceInput } from "./types";

/**
 * Pure function: turns validated user input into the payload for the
 * create_invoice_with_items database function.
 *
 * SNAPSHOT RULE: description, unit_price, discount_percent and tax_rate are copied onto each
 * invoice line here. Later edits to a plan or product never change an existing invoice.
 * All amounts come from src/lib/money.ts (the single source of calculation truth) and are
 * computed on the server – amounts sent by the browser are never trusted.
 */
function buildItems(source: CreateInvoiceInput["items"]) {
  return source.map((item, index) => {
    const line = calcLine(item);
    return {
      plan_id: item.plan_id ?? null,
      product_id: item.product_id ?? null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      tax_rate: item.tax_rate,
      discount_amount: line.discount_amount,
      tax_amount: line.tax_amount,
      line_total: line.line_total,
      sort_order: index,
    };
  });
}

export function buildInvoicePayload(input: CreateInvoiceInput) {
  const items = buildItems(input.items);
  const totals: DocumentTotals = calcTotals(input.items);

  const invoice = {
    customer_id: input.customer_id,
    subscription_id: input.subscription_id ?? null,
    currency: input.currency,
    issue_date: input.issue_date,
    due_date: input.due_date,
    period_start: input.period_start ?? null,
    period_end: input.period_end ?? null,
    notes: input.notes ?? null,
    ...totals,
  };

  return { invoice, items, totals };
}

/**
 * Payload for update_draft_invoice. Only the keys the caller sent are included, so the database
 * patches exactly those header fields. Totals are recomputed only when the lines are replaced.
 */
export function buildInvoiceUpdatePayload(input: UpdateInvoiceInput) {
  const invoice: Record<string, unknown> = {};
  const headerKeys = ["customer_id", "subscription_id", "currency", "issue_date", "due_date", "period_start", "period_end", "notes"] as const;
  for (const key of headerKeys) {
    if (input[key] !== undefined) invoice[key] = input[key] ?? null;
  }
  if (!input.items) return { invoice, items: null };
  const items = buildItems(input.items);
  Object.assign(invoice, calcTotals(input.items));
  return { invoice, items };
}
