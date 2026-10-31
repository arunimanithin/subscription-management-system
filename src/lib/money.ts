/**
 * SHARED – the ONLY place line / document totals are calculated.
 * Quotations, subscriptions and invoices must all use these helpers so a
 * quotation converted to an invoice produces identical numbers.
 *
 * Rules: gross = qty × unit_price; discount applies first; tax is charged on
 * the discounted amount; every amount is rounded to 2 decimals per line.
 * A line can carry EITHER a percentage discount OR a fixed amount discount (the fixed amount
 * wins when both are given and is capped at the gross amount, so a line can never go negative).
 */

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface LineInput {
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  /** Fixed discount in currency units for the whole line (not per unit). */
  discount_amount?: number;
  tax_rate?: number;
}

export interface LineTotals {
  gross: number;
  discount_amount: number;
  taxable: number;
  tax_amount: number;
  line_total: number;
}

export function calcLine(line: LineInput): LineTotals {
  const gross = round2(line.quantity * line.unit_price);
  const fixed = line.discount_amount ?? 0;
  const discount_amount =
    fixed > 0 ? round2(Math.min(fixed, gross)) : round2((gross * (line.discount_percent ?? 0)) / 100);
  const taxable = round2(gross - discount_amount);
  const tax_amount = round2((taxable * (line.tax_rate ?? 0)) / 100);
  return { gross, discount_amount, taxable, tax_amount, line_total: round2(taxable + tax_amount) };
}

export interface DocumentTotals {
  subtotal: number; // sum of gross (before discount and tax)
  discount_total: number;
  tax_total: number;
  total: number; // subtotal - discount_total + tax_total
}

export function calcTotals(lines: LineInput[]): DocumentTotals {
  const parts = lines.map(calcLine);
  const sum = (pick: (l: LineTotals) => number) => round2(parts.reduce((a, l) => a + pick(l), 0));
  return {
    subtotal: sum((l) => l.gross),
    discount_total: sum((l) => l.discount_amount),
    tax_total: sum((l) => l.tax_amount),
    total: sum((l) => l.line_total),
  };
}

/** Monthly-recurring value of a recurring amount (tax excluded). Matches the SQL view. */
export function toMonthly(
  amount: number,
  interval: "week" | "month" | "quarter" | "year",
  intervalCount = 1,
): number {
  const perMonth = { week: 52 / 12, month: 1, quarter: 1 / 3, year: 1 / 12 }[interval];
  return round2((amount * perMonth) / intervalCount);
}
