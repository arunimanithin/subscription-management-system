import type { NextRequest } from "next/server";
import { authorize, parseQuery } from "@/lib/api/guard";
import { fromSupabaseError, ok } from "@/lib/api/respond";
import { defaultPeriod, summaryQuerySchema } from "@/features/billing/reports/period";
import { getFinancialSummary } from "@/features/billing/reports/service";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

/**
 * GET /api/invoices/summary?from=YYYY-MM-DD&to=YYYY-MM-DD – admin/staff: billed, collected, outstanding and
 * overdue money per currency, status breakdown, payment methods and a monthly trend.
 * Without `from`/`to` it covers the last 12 months; pass `from=2000-01-01` for all history.
 */
export async function GET(request: NextRequest) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const query = parseQuery(request, summaryQuerySchema);
  if (!query.ok) return query.response;

  const fallback = defaultPeriod();
  const { data, error } = await getFinancialSummary(auth.ctx.supabase, {
    from: query.data.from ?? (query.data.to ? undefined : fallback.from),
    to: query.data.to ?? (query.data.from ? undefined : fallback.to),
  });
  if (error) return fromSupabaseError(error);
  return ok(data);
}
