import type { SupabaseClient } from "@supabase/supabase-js";
import { toRange } from "@/lib/api/respond";
import type { Customer, Invoice } from "@/types/entities";
import type { InvoiceDetail } from "@/types/api";
import { buildInvoicePayload, buildInvoiceUpdatePayload } from "./build-invoice";
import type { CreateInvoiceInput, UpdateInvoiceInput } from "./types";

type DbError = { code?: string; message: string };
type Result<T> = { data: T; error: null } | { data: null; error: DbError };

export type InvoiceListRow = Invoice & { customer: Pick<Customer, "id" | "name"> | null };

export interface ListInvoicesParams {
  page: number;
  page_size: number;
  search?: string;
  /** Any invoice status, or the pseudo-status "overdue" = unpaid balance and due date already passed. */
  status?: string;
  customer_id?: string;
  issue_from?: string;
  issue_to?: string;
  due_from?: string;
  due_to?: string;
}

const todayUtc = () => new Date().toISOString().slice(0, 10);

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

  if (params.status === "overdue") {
    // Accurate even before the overdue sweep has run: still owes money and the due date has passed.
    query = query.in("status", ["open", "partially_paid", "overdue"]).lt("due_date", todayUtc());
  } else if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.customer_id) query = query.eq("customer_id", params.customer_id);
  if (params.issue_from) query = query.gte("issue_date", params.issue_from);
  if (params.issue_to) query = query.lte("issue_date", params.issue_to);
  if (params.due_from) query = query.gte("due_date", params.due_from);
  if (params.due_to) query = query.lte("due_date", params.due_to);
  if (params.search) {
    // strip characters that have meaning inside a PostgREST filter expression
    const term = params.search.replace(/[%,()*\\]/g, " ").trim();
    if (term) {
      // match the invoice number OR the customer name
      const { data: matches } = await supabase.from("customers").select("id").ilike("name", `%${term}%`).limit(50);
      const ids = (matches ?? []).map((c: { id: string }) => c.id);
      query = ids.length
        ? query.or(`invoice_number.ilike.%${term}%,customer_id.in.(${ids.join(",")})`)
        : query.ilike("invoice_number", `%${term}%`);
    }
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
 * twice or issuing a non-draft is rejected instead of silently succeeding.
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

/** Void a draft / open / overdue invoice that has no payments (public.void_invoice). */
export async function voidInvoice(supabase: SupabaseClient, id: string, reason?: string): Promise<Result<InvoiceDetail>> {
  const { error } = await supabase.rpc("void_invoice", { p_invoice_id: id, p_reason: reason ?? null });
  if (error) return { data: null, error };
  return getInvoice(supabase, id);
}

/**
 * Edit a DRAFT invoice (public.update_draft_invoice). Only the supplied fields change; supplying
 * `items` replaces all lines and recomputes the totals on the server.
 */
export async function updateDraftInvoice(supabase: SupabaseClient, id: string, input: UpdateInvoiceInput): Promise<Result<InvoiceDetail>> {
  const { invoice, items } = buildInvoiceUpdatePayload(input);
  const { error } = await supabase.rpc("update_draft_invoice", { p_invoice_id: id, p_invoice: invoice, p_items: items });
  if (error) return { data: null, error };
  return getInvoice(supabase, id);
}

/** Marks open / partially paid invoices past their due date as overdue. Returns how many changed. */
export async function markOverdueInvoices(supabase: SupabaseClient): Promise<Result<number>> {
  const { data, error } = await supabase.rpc("mark_overdue_invoices");
  if (error) return { data: null, error };
  return { data: Number(data ?? 0), error: null };
}
