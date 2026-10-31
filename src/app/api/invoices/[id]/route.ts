import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/api/guard";
import { fail, fromSupabaseError, notImplemented, ok } from "@/lib/api/respond";
import { getInvoice } from "@/features/billing/invoices/service";

// Owner: Member 3 (billing). Contract: CONTRACTS.md section 4.

/** GET /api/invoices/:id – invoice with customer, items and payments. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return fail("VALIDATION_ERROR", "Invalid invoice id");

  const { data, error } = await getInvoice(auth.ctx.supabase, id);
  if (error) return fromSupabaseError(error);
  return ok(data);
}

// Editing a draft invoice is not part of Part 1 (see billing plan).
export const PATCH = () => notImplemented("PATCH /api/invoices/:id");
