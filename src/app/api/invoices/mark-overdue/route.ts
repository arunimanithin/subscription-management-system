import { authorize } from "@/lib/api/guard";
import { fromSupabaseError, ok } from "@/lib/api/respond";
import { markOverdueInvoices } from "@/features/billing/invoices/service";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

/** POST /api/invoices/mark-overdue – admin/staff: flag open/partially paid invoices past their due date. Idempotent. */
export async function POST() {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { data, error } = await markOverdueInvoices(auth.ctx.supabase);
  if (error) return fromSupabaseError(error);
  return ok({ updated: data });
}
