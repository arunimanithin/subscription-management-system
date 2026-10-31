import type { NextRequest } from "next/server";
import { authorize, parseQuery } from "@/lib/api/guard";
import { fromSupabaseError, ok } from "@/lib/api/respond";
import { agingQuerySchema } from "@/features/billing/reports/period";
import { getAgingReport } from "@/features/billing/reports/service";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

/** GET /api/invoices/aging?as_of=YYYY-MM-DD – admin/staff: unpaid balances by days past due, per currency. */
export async function GET(request: NextRequest) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const query = parseQuery(request, agingQuerySchema);
  if (!query.ok) return query.response;

  const { data, error } = await getAgingReport(auth.ctx.supabase, query.data);
  if (error) return fromSupabaseError(error);
  return ok(data);
}
