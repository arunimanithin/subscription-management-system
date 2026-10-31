import type {
  ConvertQuotationResponse,
  CreateQuotationRequest,
  QuotationDetail,
  QuotationListResponse,
  QuotationResponse,
  UpdateQuotationRequest,
} from "@/types/api";
import type { ApiErrorBody } from "@/types/api";

export const QUOTATION_STATUS_OPTIONS = ["all", "draft", "sent", "accepted", "rejected", "expired", "converted"] as const;

export type QuotationFilterStatus = (typeof QUOTATION_STATUS_OPTIONS)[number];

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T | Partial<ApiErrorBody>;

  if (!response.ok) {
    const error = payload as Partial<ApiErrorBody>;
    throw new Error(error.error?.message ?? "Request failed");
  }

  return payload as T;
}

export async function listQuotations(params: {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
} = {}): Promise<QuotationListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));
  if (params.search) searchParams.set("search", params.search);
  if (params.status && params.status !== "all") searchParams.set("status", params.status);

  const query = searchParams.toString();
  return fetchJson<QuotationListResponse>(`/api/quotations${query ? `?${query}` : ""}`);
}

export async function getQuotationById(id: string): Promise<QuotationDetail> {
  const payload = await fetchJson<QuotationResponse>(`/api/quotations/${id}`);
  return payload.data;
}

export async function createQuotation(data: CreateQuotationRequest): Promise<QuotationDetail> {
  const payload = await fetchJson<QuotationResponse>("/api/quotations", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return payload.data;
}

export async function updateQuotation(id: string, data: UpdateQuotationRequest): Promise<QuotationDetail> {
  const payload = await fetchJson<QuotationResponse>(`/api/quotations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return payload.data;
}

export async function transitionQuotation(id: string, action: "send" | "accept" | "reject"): Promise<QuotationDetail> {
  const payload = await fetchJson<QuotationResponse>(`/api/quotations/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
  return payload.data;
}

export async function convertQuotation(
  id: string,
  data: { start_date: string; billing_interval?: "week" | "month" | "quarter" | "year"; interval_count?: number },
): Promise<ConvertQuotationResponse["data"]> {
  const payload = await fetchJson<ConvertQuotationResponse>(`/api/quotations/${id}/convert`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return payload.data;
}

export function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
