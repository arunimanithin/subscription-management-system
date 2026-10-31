import type { NextRequest } from "next/server";
import { authorize, parseBody, parseQuery } from "@/lib/api/guard";
import { ok, list, fromSupabaseError, toRange } from "@/lib/api/respond";
import { listQuerySchema, createQuotationSchema } from "@/types/schemas";
import { calcLine, calcTotals } from "@/lib/money";
import type { QuotationDetail } from "@/types/api";

// ---------------------------------------------------------------------------
// GET /api/quotations
// Roles: admin, staff, customer (RLS hides drafts from customers)
// Query: page, page_size, search, status
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await authorize(["admin", "staff", "customer"]);
  if (!auth.ok) return auth.response;
  const { supabase } = auth.ctx;

  const query = parseQuery(request, listQuerySchema);
  if (!query.ok) return query.response;
  const { page, page_size, search, status } = query.data;
  const [from, to] = toRange(page, page_size);

  let q = supabase
    .from("quotations")
    .select(
      `
      *,
      customer:customers!inner(id, name, email, company),
      items:quotation_items(*)
      `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    q = q.eq("status", status);
  }

  if (search) {
    q = q.ilike("quotation_number", `%${search}%`);
  }

  const { data, error, count } = await q;

  if (error) return fromSupabaseError(error);

  return list<QuotationDetail>(data as QuotationDetail[], {
    page,
    page_size,
    total: count ?? 0,
  });
}

// ---------------------------------------------------------------------------
// POST /api/quotations
// Roles: admin, staff
// Body: createQuotationSchema
// Totals are always computed server-side using calcLine/calcTotals.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const auth = await authorize(["admin", "staff"]);
  if (!auth.ok) return auth.response;
  const { supabase, profile } = auth.ctx;

  const body = await parseBody(request, createQuotationSchema);
  if (!body.ok) return body.response;
  const { customer_id, currency, valid_until, notes, terms, items } = body.data;

  // Compute document totals server-side — calcTotals is the single source of truth
  const { subtotal, discount_total, tax_total, total } = calcTotals(items);

  // Insert quotation header
  const { data: quo, error: quoError } = await supabase
    .from("quotations")
    .insert({
      customer_id,
      currency,
      valid_until: valid_until ?? null,
      notes: notes ?? null,
      terms: terms ?? null,
      subtotal,
      discount_total,
      tax_total,
      total,
      created_by: profile.id,
      // status defaults to 'draft' per DB constraint
    })
    .select("id, quotation_number")
    .single();

  if (quoError || !quo) return fromSupabaseError(quoError ?? { message: "Failed to create quotation" });

  // Insert items with computed per-line amounts
  const itemRows = items.map((item, idx) => {
    const { discount_amount, tax_amount, line_total } = calcLine(item);
    return {
      quotation_id: quo.id,
      plan_id: item.plan_id ?? null,
      product_id: item.product_id ?? null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent ?? 0,
      tax_rate: item.tax_rate ?? 0,
      discount_amount,
      tax_amount,
      line_total,
      sort_order: idx,
    };
  });

  const { error: itemsError } = await supabase.from("quotation_items").insert(itemRows);
  if (itemsError) {
    // Roll back header
    await supabase.from("quotations").delete().eq("id", quo.id);
    return fromSupabaseError(itemsError);
  }

  // Re-fetch full detail
  const { data: full, error: fetchError } = await supabase
    .from("quotations")
    .select(
      `
      *,
      customer:customers!inner(id, name, email, company),
      items:quotation_items(*)
      `,
    )
    .eq("id", quo.id)
    .single();

  if (fetchError || !full) return fromSupabaseError(fetchError ?? { message: "Failed to fetch created quotation" });

  return ok<QuotationDetail>(full as QuotationDetail, 201);
}
