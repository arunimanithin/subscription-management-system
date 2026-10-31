import { getSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import {
  MOCK_PORTAL_CUSTOMER,
  MOCK_PORTAL_DATA,
  type PortalCustomerData,
} from "./portal-data";
import type { Customer } from "@/types";

export interface PortalAuthResult {
  customer: Customer;
  role: "customer";
}

/**
 * Validates authenticated customer session.
 * Security enforcement:
 * 1. Admin/Staff are redirected away to /dashboard.
 * 2. Unauthenticated sessions either redirect to /auth/login or use demo customer in local mock mode.
 * 3. Never trust client or URL IDs; customer ID is derived purely from session profile.
 */
export async function requireCustomerSession(): Promise<PortalAuthResult> {
  const env = getSupabaseEnv();
  if (!env) {
    return {
      customer: MOCK_PORTAL_CUSTOMER,
      role: "customer",
    };
  }

  const supabase = await createClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();

  if (authErr || !authData.user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profile && (profile.role === "admin" || profile.role === "staff")) {
    redirect("/dashboard");
  }

  const { data: customerRecord } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", authData.user.id)
    .single();

  if (!customerRecord) notFound();

  return {
    customer: customerRecord as Customer,
    role: "customer",
  };
}

/**
 * Fetches portal data using only the verified customer linked to this session.
 */
export async function getCustomerPortalData(): Promise<PortalCustomerData> {
  const { customer } = await requireCustomerSession();
  const env = getSupabaseEnv();
  if (!env) {
    return MOCK_PORTAL_DATA;
  }

  const emptyData: PortalCustomerData = {
    customer,
    subscriptions: [],
    invoices: [],
    payments: [],
    outstandingBalance: 0,
    upcomingRenewals: [],
  };

  try {
    const supabase = await createClient();

    // 1. Fetch customer's own subscriptions
    const { data: subsData } = await supabase
      .from("subscriptions")
      .select("*, subscription_items(*)")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    // 2. Fetch customer's own invoices (non-drafts)
    const { data: invData } = await supabase
      .from("invoices")
      .select("*")
      .eq("customer_id", customer.id)
      .neq("status", "draft")
      .order("issue_date", { ascending: false });

    // 3. Fetch customer's own payments
    const { data: payData } = await supabase
      .from("payments")
      .select("*")
      .eq("customer_id", customer.id)
      .order("paid_at", { ascending: false });

    let outstanding = 0;
    const formattedInvoices = (invData || []).map((inv: Record<string, unknown>) => {
      const due = Number(inv.amount_due) || 0;
      if (inv.status === "open" || inv.status === "partially_paid" || inv.status === "overdue") {
        outstanding += due;
      }
      return {
        ...inv,
        items_count: 1,
      } as PortalCustomerData["invoices"][number];
    });

    const now = new Date();
    const formattedRenewals = (subsData || [])
      .filter((sub: Record<string, unknown>) => sub.status === "active" && sub.next_billing_date)
      .map((sub: Record<string, unknown>) => {
        const renewalDate = new Date(String(sub.next_billing_date));
        const diffDays = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: String(sub.id),
          subscription_number: String(sub.subscription_number),
          plan_name: "Subscription Plan",
          amount: 2999,
          renewal_date: String(sub.next_billing_date),
          days_left: diffDays,
          status: String(sub.status),
        };
      })
      .filter((r) => r.days_left >= 0 && r.days_left <= 30);

    return {
      customer,
      subscriptions: (subsData || []).map((sub: Record<string, unknown>) => ({
        ...sub,
        plan_name: "SubscriptIQ Plan",
        can_upgrade: true,
        can_downgrade: false,
        items: (sub.subscription_items as unknown[]) || [],
      })) as PortalCustomerData["subscriptions"],
      invoices: formattedInvoices,
      payments: (payData || []) as PortalCustomerData["payments"],
      outstandingBalance: outstanding,
      upcomingRenewals: formattedRenewals,
    };
  } catch {
    return emptyData;
  }
}
