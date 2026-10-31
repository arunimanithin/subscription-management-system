import type { NextRequest } from "next/server";
import { authorize, parseBody } from "@/lib/api/guard";
import { ok, fail, fromSupabaseError } from "@/lib/api/respond";
import { quotationTransitionSchema } from "@/types/schemas";
import type { QuotationDetail } from "@/types/api";
import type { QuotationStatus } from "@/types/enums";

// ---------------------------------------------------------------------------
// POST /api/quotations/:id/transition
// Roles: admin, staff
// Body: { action: send | accept | reject }
//
// State machine (CONTRACTS.md §3):
//   send   : draft   → sent     (sets sent_at)
//   accept : sent    → accepted (sets accepted_at)
//   reject : sent    → rejected
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { supabase } = auth.ctx;
  const { id } = await params;

  const body = await parseBody(request, quotationTransitionSchema);
  if (!body.ok) return body.response;
  const { action } = body.data;

  // Fetch current quotation status
  const { data: quo, error: fetchError } = await supabase
    .from("quotations")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchError || !quo) return fail("NOT_FOUND", "Quotation not found");

  const now = new Date().toISOString();
  const currentStatus = quo.status as QuotationStatus;
  let patch: Record<string, unknown> = {};

  switch (action) {
    case "send": {
      if (currentStatus !== "draft") {
        return fail("INVALID_STATE", `Cannot send a quotation in '${currentStatus}' status. Only 'draft' quotations can be sent.`);
      }
      patch = { status: "sent", sent_at: now };
      break;
    }

    case "accept": {
      if (currentStatus !== "sent") {
        return fail("INVALID_STATE", `Cannot accept a quotation in '${currentStatus}' status. Only 'sent' quotations can be accepted.`);
      }
      patch = { status: "accepted", accepted_at: now };
      break;
    }

    case "reject": {
      if (currentStatus !== "sent") {
        return fail("INVALID_STATE", `Cannot reject a quotation in '${currentStatus}' status. Only 'sent' quotations can be rejected.`);
      }
      patch = { status: "rejected" };
      break;
    }

    default:
      return fail("VALIDATION_ERROR", `Unknown action: ${action}`);
  }

  const { error: updateError } = await supabase
    .from("quotations")
    .update(patch)
    .eq("id", id);

  if (updateError) return fromSupabaseError(updateError);

  // Re-fetch full detail
  const { data: full, error: fullFetchError } = await supabase
    .from("quotations")
    .select(
      `
      *,
      customer:customers!inner(id, name, email, company),
      items:quotation_items(*)
      `,
    )
    .eq("id", id)
    .single();

  if (fullFetchError || !full) return fromSupabaseError(fullFetchError ?? { message: "Failed to fetch updated quotation" });

  return ok<QuotationDetail>(full as QuotationDetail);
}
