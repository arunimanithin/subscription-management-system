import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine((s) => {
    const t = Date.parse(`${s}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s; // rejects 2026-13-01 and 2026-02-30
  }, "Not a real calendar date");

/** Query for GET /api/invoices/summary. Both dates are optional and inclusive. */
export const summaryQuerySchema = z
  .object({ from: isoDate.optional(), to: isoDate.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "from cannot be later than to", path: ["from"] });

/** Query for GET /api/invoices/aging. */
export const agingQuerySchema = z.object({ as_of: isoDate.optional() });

/**
 * Default reporting window: the current month and the 11 before it (12 months),
 * ending today. Calendar maths in UTC so the result does not depend on the server's time zone.
 */
export function defaultPeriod(today: Date = new Date()): { from: string; to: string } {
  const to = today.toISOString().slice(0, 10);
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));
  return { from: first.toISOString().slice(0, 10), to };
}
