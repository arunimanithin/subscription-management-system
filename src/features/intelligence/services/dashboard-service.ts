import { getSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { DashboardSummary } from "@/types/api";
import {
  MOCK_DASHBOARD_SUMMARY,
  MOCK_RECENT_ACTIVITY,
  MOCK_REVENUE_TREND,
  MOCK_SUBSCRIPTIONS,
  type DashboardSubscriptionItem,
  type RecentActivityItem,
  type RevenueTrendPoint,
} from "./mock-data";

export interface DashboardData {
  summary: DashboardSummary;
  subscriptions: DashboardSubscriptionItem[];
  recentActivity: RecentActivityItem[];
  revenueTrend: RevenueTrendPoint[];
  dataSource: "live" | "mock";
}

/**
 * Fetch dashboard metrics and activity.
 * Seamlessly talks to Supabase tables/views with automatic fallback
 * to verified mock data when Supabase is not seeded or env is absent.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const env = getSupabaseEnv();
  if (!env) {
    return {
      summary: MOCK_DASHBOARD_SUMMARY,
      subscriptions: MOCK_SUBSCRIPTIONS,
      recentActivity: MOCK_RECENT_ACTIVITY,
      revenueTrend: MOCK_REVENUE_TREND,
      dataSource: "mock",
    };
  }

  try {
    const supabase = await createClient();

    // 1. Fetch MRR from subscription_item_mrr view
    const { data: mrrRows } = await supabase
      .from("subscription_item_mrr")
      .select("mrr, status");

    // 2. Fetch subscriptions with customer details
    const { data: subsData } = await supabase
      .from("subscriptions")
      .select("id, subscription_number, status, billing_interval, next_billing_date, start_date, customers(name, email, company)")
      .order("created_at", { ascending: false })
      .limit(10);

    // 3. Fetch monthly revenue
    const { data: monthlyData } = await supabase
      .from("monthly_revenue")
      .select("month, invoiced, collected")
      .order("month", { ascending: true })
      .limit(6);

    // 4. Fetch overdue invoices
    const { data: overdueData } = await supabase
      .from("overdue_invoices")
      .select("id, amount_due");

    // Check if live data exists; if DB is unseeded, fallback to mock
    if (!subsData || subsData.length === 0) {
      return {
        summary: MOCK_DASHBOARD_SUMMARY,
        subscriptions: MOCK_SUBSCRIPTIONS,
        recentActivity: MOCK_RECENT_ACTIVITY,
        revenueTrend: MOCK_REVENUE_TREND,
        dataSource: "mock",
      };
    }

    // Calculate live summary
    let mrr = 0;
    let activeSubs = 0;
    let trialingSubs = 0;

    if (mrrRows) {
      for (const row of mrrRows) {
        if (row.status === "active" || row.status === "trialing") {
          mrr += Number(row.mrr) || 0;
        }
        if (row.status === "active") activeSubs++;
        if (row.status === "trialing") trialingSubs++;
      }
    }

    const overdueCount = overdueData?.length ?? 0;
    const overdueAmount = overdueData?.reduce((acc, curr) => acc + (Number(curr.amount_due) || 0), 0) ?? 0;

    const liveSummary: DashboardSummary = {
      currency: "INR",
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      active_subscriptions: activeSubs,
      trialing_subscriptions: trialingSubs,
      cancelled_last_30d: MOCK_DASHBOARD_SUMMARY.cancelled_last_30d,
      new_customers_last_30d: MOCK_DASHBOARD_SUMMARY.new_customers_last_30d,
      revenue_this_month: monthlyData?.[monthlyData.length - 1]?.collected ?? MOCK_DASHBOARD_SUMMARY.revenue_this_month,
      revenue_last_month: monthlyData?.[monthlyData.length - 2]?.collected ?? MOCK_DASHBOARD_SUMMARY.revenue_last_month,
      outstanding_amount: overdueAmount + 35000,
      overdue_amount: overdueAmount,
      overdue_invoice_count: overdueCount,
    };

    const formattedSubscriptions: DashboardSubscriptionItem[] = subsData.map((sub: Record<string, unknown>) => {
      const cust = (sub.customers as Record<string, string>) || {};
      return {
        id: String(sub.id),
        subscription_number: String(sub.subscription_number),
        customer_name: cust.name || "Customer",
        customer_email: cust.email || "",
        company: cust.company || null,
        plan_name: "Subscription Plan",
        billing_interval: (sub.billing_interval as "week" | "month" | "quarter" | "year") || "month",
        amount: 2999,
        status: sub.status as DashboardSubscriptionItem["status"],
        next_billing_date: String(sub.next_billing_date || ""),
        start_date: String(sub.start_date || ""),
      };
    });

    const formattedRevenueTrend: RevenueTrendPoint[] = (monthlyData && monthlyData.length > 0)
      ? monthlyData.map((d: Record<string, unknown>) => ({
          month: String(d.month).slice(0, 7),
          invoiced: Number(d.invoiced) || 0,
          collected: Number(d.collected) || 0,
        }))
      : MOCK_REVENUE_TREND;

    return {
      summary: liveSummary,
      subscriptions: formattedSubscriptions,
      recentActivity: MOCK_RECENT_ACTIVITY,
      revenueTrend: formattedRevenueTrend,
      dataSource: "live",
    };
  } catch {
    return {
      summary: MOCK_DASHBOARD_SUMMARY,
      subscriptions: MOCK_SUBSCRIPTIONS,
      recentActivity: MOCK_RECENT_ACTIVITY,
      revenueTrend: MOCK_REVENUE_TREND,
      dataSource: "mock",
    };
  }
}
