import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/api/guard";
import { fail, fromSupabaseError, ok } from "@/lib/api/respond";
import { runRecurringBilling } from "@/features/billing/recurring/service";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

const bodySchema = z.object({ issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD").optional() });

/**
 * POST /api/invoices/generate-due  { issue_date? }  (body optional)
 * Recurring billing run: bills every active / past_due subscription whose billing date has
 * arrived (one period each). Safe to repeat. Returns a per-subscription summary.
 */
export async function POST(request: NextRequest) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;

  const raw = await request.text();
  let json: unknown = {};
  if (raw.trim()) {
    try {
      json = JSON.parse(raw);
    } catch {
      return fail("VALIDATION_ERROR", "Request body must be valid JSON");
    }
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());

  const { data, error } = await runRecurringBilling(auth.ctx.supabase, parsed.data.issue_date);
  if (error) return fromSupabaseError(error);
  return ok(data);
}
