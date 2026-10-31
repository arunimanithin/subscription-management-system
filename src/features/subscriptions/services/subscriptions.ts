import type {
  CreateSubscriptionRequest,
  SubscriptionDetail,
  SubscriptionListResponse,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
} from "@/types/api";
import type { ApiErrorBody } from "@/types/api";
import { calcLine, round2 } from "@/lib/money";

export const SUBSCRIPTION_STATUS_OPTIONS = [
  "all",
  "draft",
  "trialing",
  "active",
  "paused",
  "past_due",
  "cancelled",
  "expired",
] as const;

export type SubscriptionFilterStatus = (typeof SUBSCRIPTION_STATUS_OPTIONS)[number];

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

export async function listSubscriptions(params: {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
} = {}): Promise<SubscriptionListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));
  if (params.search) searchParams.set("search", params.search);
  if (params.status && params.status !== "all") searchParams.set("status", params.status);

  const query = searchParams.toString();
  return fetchJson<SubscriptionListResponse>(`/api/subscriptions${query ? `?${query}` : ""}`);
}

export async function getSubscriptionById(id: string): Promise<SubscriptionDetail> {
  const payload = await fetchJson<SubscriptionResponse>(`/api/subscriptions/${id}`);
  return payload.data;
}

export async function createSubscription(data: CreateSubscriptionRequest): Promise<SubscriptionDetail> {
  const payload = await fetchJson<SubscriptionResponse>("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return payload.data;
}

export async function updateSubscription(id: string, data: UpdateSubscriptionRequest): Promise<SubscriptionDetail> {
  const payload = await fetchJson<SubscriptionResponse>(`/api/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return payload.data;
}

export async function transitionSubscription(
  id: string,
  action: "activate" | "pause" | "resume" | "cancel",
  at_period_end = false,
): Promise<SubscriptionDetail> {
  const payload = await fetchJson<SubscriptionResponse>(`/api/subscriptions/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ action, at_period_end }),
  });
  return payload.data;
}

export async function renewSubscription(id: string): Promise<SubscriptionDetail> {
  const payload = await fetchJson<SubscriptionResponse>(`/api/subscriptions/${id}/renew`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return payload.data;
}

export function getSubscriptionPlanLabel(subscription: SubscriptionDetail): string {
  const first = subscription.items[0];
  if (!first) return "Custom plan";
  return first.description || `${subscription.items.length} items`;
}

export function getSubscriptionTotal(subscription: SubscriptionDetail): number {
  const total = subscription.items.reduce((sum, item) => {
    const line = calcLine({
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      tax_rate: item.tax_rate,
    });
    return sum + line.line_total;
  }, 0);
  return round2(total);
}

export function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
