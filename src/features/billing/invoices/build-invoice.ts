import { calcLine, calcTotals, type DocumentTotals } from "@/lib/money";
import type { CreateInvoiceInput } from "./types";

/**
 * Pure function: turns validated user input into the payload for the
 * create_invoice_with_items database function.
 *
 * SNAPSHOT RULE: description, unit_price, discount_percent and tax_rate are copied onto each
 * invoice line here. Later edits to a plan or product never change an existing invoice.
 * All amounts come from src/lib/money.ts (the single source of calculation truth) and are
 * computed on the server – amounts sent by the browser are never trusted.
 */
export function buildInvoicePayload(input: CreateInvoiceInput) {
  const items = input.items.map((item, index) => {
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
