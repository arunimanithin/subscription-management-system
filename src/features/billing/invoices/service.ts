import type { SupabaseClient } from "@supabase/supabase-js";
import { toRange } from "@/lib/api/respond";
import type { Customer, Invoice } from "@/types/entities";
import type { InvoiceDetail } from "@/types/api";
import { buildInvoicePayload } from "./build-invoice";
import type { CreateInvoiceInput } from "./types";

type DbError = { code?: string; message: string };
type Result<T> = { data: T; error: null } | { data: null; error: DbError };

export type InvoiceListRow = Invoice & { customer: Pick<Customer, "id" | "name"> | null };

export interface ListInvoicesParams {
  page: number;
  page_size: number;
  search?: string;
  status?: string;
}

/** Paginated invoice list. RLS decides what the caller may see (customers: own, non-draft). */
export async function listInvoices(
  supabase: SupabaseClient,
  params: ListInvoicesParams,
): Promise<Result<{ rows: InvoiceListRow[]; total: number }>> {
  const [from, to] = toRange(params.page, params.page_size);
  let query = supabase
    .from("invoices")
    .select("*, customer:customers(id, name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status) query = query.eq("status", params.status);
  if (params.search) {
    // strip characters that have meaning inside a PostgREST filter expression
    const term = params.search.replace(/[%,()*]/g, " ").trim();
    if (term) query = query.ilike("invoice_number", `%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) return { data: null, error };
  return { data: { rows: (data ?? []) as InvoiceListRow[], total: count ?? 0 }, error: null };
}

/** One invoice with customer, line items (in order) and payments. */
export async function getInvoice(supabase: SupabaseClient, id: string): Promise<Result<InvoiceDetail>> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, customer:customers(id, name, email, company), items:invoice_items(*), payments(*)")
    .eq("id", id)
    .order("sort_order", { referencedTable: "invoice_items", ascending: true })
    .order("paid_at", { referencedTable: "payments", ascending: false })
    .single();
  if (error) return { data: null, error };
  return { data: data as InvoiceDetail, error: null };
}

/**
 * Creates a DRAFT invoice with its line items in a single database transaction
 * (public.create_invoice_with_items). Invoice numbers (INV-000001…) come from a database
 * sequence, so they are unique even under concurrent requests; a failed attempt may leave a
 * gap in the sequence, which is normal for invoice numbering.
 */
export async function createInvoice(supabase: SupabaseClient, input: CreateInvoiceInput): Promise<Result<InvoiceDetail>> {
  const { invoice, items } = buildInvoicePayload(input);
  const { data: id, error } = await supabase.rpc("create_invoice_with_items", {
    p_invoice: invoice,
    p_items: items,
  });
  if (error) return { data: null, error };
  return getInvoice(supabase, id as string);
}

/**
 * Issue a draft invoice (draft -> open). The conditional update only matches a draft, so issuing
 * twice or issuing a non-draft is rejected instead of silently succeeding. Full lifecycle
 * (void, overdue) comes in Part 3.
 */
export async function issueInvoice(
  supabase: SupabaseClient,
  id: string,
): Promise<Result<InvoiceDetail> | { data: null; error: DbError; invalidState: string }> {
  const { data: current, error: readError } = await supabase.from("invoices").select("status, total").eq("id", id).maybeSingle();
  if (readError) return { data: null, error: readError };
  if (!current) return { data: null, error: { code: "PGRST116", message: "Invoice not found" } };
  if (current.status !== "draft") {
    return {
      data: null,
      error: { message: `Only draft invoices can be issued (this invoice is ${current.status})` },
      invalidState: current.status as string,
    };
  }
  if (Number(current.total) <= 0) {
    return { data: null, error: { code: "23514", message: "An invoice with a zero total cannot be issued" } };
  }

  const { data: updated, error } = await supabase
    .from("invoices")
    .update({ status: "open" })
    .eq("id", id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error) return { data: null, error };
  if (!updated) {
    // someone else changed it between our read and update
    return { data: null, error: { message: "The invoice was changed by someone else; reload and try again" }, invalidState: "changed" };
  }
  return getInvoice(supabase, id);
}
