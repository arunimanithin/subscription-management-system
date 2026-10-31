import type { SupabaseClient } from "@supabase/supabase-js";
import { toRange } from "@/lib/api/respond";
import { round2 } from "@/lib/money";
import type { Payment } from "@/types/entities";
import type { z } from "zod";
import type { createPaymentSchema } from "@/types/schemas";

type DbError = { code?: string; message: string };
type Result<T> = { data: T; error: null } | { data: null; error: DbError };

export type CreatePaymentInput = z.output<typeof createPaymentSchema>;
export type PaymentListRow = Payment & { invoice_number: string; customer_name: string | null };

export interface ListPaymentsParams {
  page: number;
  page_size: number;
  status?: string;
  invoice_id?: string;
}

const LIST_SELECT = "*, invoice:invoices(invoice_number), customer:customers(name)";

type RawRow = Payment & { invoice: { invoice_number: string } | null; customer: { name: string } | null };

function toListRow({ invoice, customer, ...payment }: RawRow): PaymentListRow {
  return { ...(payment as Payment), invoice_number: invoice?.invoice_number ?? "—", customer_name: customer?.name ?? null };
}

/**
 * Records a payment through public.record_payment(): one transaction that locks the invoice,
 * blocks overpayment and payments on non-payable invoices, and replays duplicate requests that
 * carry the same idempotency_key (replayed = true, no second payment is created).
 */
export async function recordPayment(
  supabase: SupabaseClient,
  input: CreatePaymentInput,
): Promise<Result<{ payment: Payment; replayed: boolean }>> {
  const amount = round2(input.amount); // absorbs float noise such as 0.30000000000000004
  const { data, error } = await supabase.rpc("record_payment", {
    p_invoice_id: input.invoice_id,
    p_amount: amount,
    p_method: input.method,
    p_reference: input.reference ?? null,
    p_paid_at: input.paid_at ?? null,
    p_notes: input.notes ?? null,
    p_idempotency_key: input.idempotency_key ?? null,
    p_status: input.status,
  });
  if (error) return { data: null, error };

  const { payment_id, replayed } = data as { payment_id: string; replayed: boolean };
  const { data: payment, error: readError } = await supabase.from("payments").select("*").eq("id", payment_id).single();
  if (readError) return { data: null, error: readError };
  return { data: { payment: payment as Payment, replayed }, error: null };
}

export async function listPayments(
  supabase: SupabaseClient,
  params: ListPaymentsParams,
): Promise<Result<{ rows: PaymentListRow[]; total: number }>> {
  const [from, to] = toRange(params.page, params.page_size);
  let query = supabase
    .from("payments")
    .select(LIST_SELECT, { count: "exact" })
    .order("paid_at", { ascending: false })
    .range(from, to);
  if (params.status) query = query.eq("status", params.status);
  if (params.invoice_id) query = query.eq("invoice_id", params.invoice_id);

  const { data, error, count } = await query;
  if (error) return { data: null, error };
  return { data: { rows: ((data ?? []) as unknown as RawRow[]).map(toListRow), total: count ?? 0 }, error: null };
}

export async function getPayment(supabase: SupabaseClient, id: string): Promise<Result<PaymentListRow>> {
  const { data, error } = await supabase.from("payments").select(LIST_SELECT).eq("id", id).single();
  if (error) return { data: null, error };
  return { data: toListRow(data as unknown as RawRow), error: null };
}

/**
 * Refund = status succeeded -> refunded. The conditional update makes a double refund impossible;
 * a database trigger then recalculates the invoice's paid amount and status.
 */
export async function refundPayment(supabase: SupabaseClient, id: string): Promise<Result<Payment> | { data: null; error: DbError; notRefundable: string }> {
  const { data, error } = await supabase
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", id)
    .eq("status", "succeeded")
    .select("*")
    .maybeSingle();
  if (error) return { data: null, error };
  if (data) return { data: data as Payment, error: null };

  const { data: existing, error: readError } = await supabase.from("payments").select("status").eq("id", id).maybeSingle();
  if (readError) return { data: null, error: readError };
  if (!existing) return { data: null, error: { code: "PGRST116", message: "Payment not found" } };
  return {
    data: null,
    error: { message: `Only succeeded payments can be refunded (this payment is ${existing.status})` },
    notRefundable: existing.status as string,
  };
}
