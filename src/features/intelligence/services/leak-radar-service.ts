import { getSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type LeakAlertType =
  | "overdue_invoice"
  | "upcoming_expiry"
  | "missed_renewal"
  | "failed_payment"
  | "expired_discount"
  | "duplicate_billing";

export type LeakAlertSeverity = "high" | "medium" | "low";

export interface LeakAlert {
  id: string;
  type: LeakAlertType;
  severity: LeakAlertSeverity;
  customer: {
    id?: string;
    name: string;
    email?: string;
    company?: string | null;
  };
  entityType: "invoice" | "subscription" | "payment";
  entityId: string;
  revenueAtRisk: number;
  explanation: string;
  recommendedAction: string;
  status: "open" | "resolved";
  detectedAt: string;
}

export interface LeakRadarSummary {
  totalRevenueAtRisk: number;
  totalAlerts: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
  openCount: number;
  resolvedCount: number;
  alerts: LeakAlert[];
  dataSource: "live" | "mock";
}

const MOCK_LEAK_ALERTS: LeakAlert[] = [
  {
    id: "alert-1",
    type: "overdue_invoice",
    severity: "medium",
    customer: {
      id: "cust-104",
      name: "Arjun Patel",
      email: "arjun.p@swiggy.in",
      company: "Bundl Technologies",
    },
    entityType: "invoice",
    entityId: "inv-138",
    revenueAtRisk: 499,
    explanation: "Invoice INV-000138 is 5 days past due date with payment unsettled.",
    recommendedAction: "Dispatch automated WhatsApp/email dunning notice with instant UPI link.",
    status: "open",
    detectedAt: "2026-10-27T10:00:00Z",
  },
  {
    id: "alert-2",
    type: "failed_payment",
    severity: "high",
    customer: {
      id: "cust-104",
      name: "Arjun Patel",
      email: "arjun.p@swiggy.in",
      company: "Bundl Technologies",
    },
    entityType: "invoice",
    entityId: "inv-138",
    revenueAtRisk: 499,
    explanation: "Automatic card debit failed with error 'card_expired' on HDFC corporate card.",
    recommendedAction: "Request primary card update via Customer Portal self-service link.",
    status: "open",
    detectedAt: "2026-10-30T14:20:00Z",
  },
  {
    id: "alert-3",
    type: "missed_renewal",
    severity: "high",
    customer: {
      id: "cust-104",
      name: "Arjun Patel",
      email: "arjun.p@swiggy.in",
      company: "Bundl Technologies",
    },
    entityType: "subscription",
    entityId: "sub-104",
    revenueAtRisk: 499,
    explanation: "Subscription renewal date (2026-10-26) elapsed without successful cycle billing.",
    recommendedAction: "Re-trigger cycle billing and mark subscription past_due if unpaid in 48h.",
    status: "open",
    detectedAt: "2026-10-27T00:00:00Z",
  },
  {
    id: "alert-4",
    type: "upcoming_expiry",
    severity: "medium",
    customer: {
      id: "cust-106",
      name: "Sneha Iyer",
      email: "s.iyer@cred.club",
      company: "Dreamplug Technologies",
    },
    entityType: "subscription",
    entityId: "sub-106",
    revenueAtRisk: 2999,
    explanation: "7-day trial for Analytics Team plan expires in 4 days with no active payment card saved.",
    recommendedAction: "Send trial conclusion email with early-bird annual upgrade discount.",
    status: "open",
    detectedAt: "2026-10-31T06:00:00Z",
  },
  {
    id: "alert-5",
    type: "expired_discount",
    severity: "low",
    customer: {
      id: "cust-101",
      name: "Rahul Sharma",
      email: "rahul@acmecorp.in",
      company: "Acme Corp India",
    },
    entityType: "subscription",
    entityId: "sub-101",
    revenueAtRisk: 600,
    explanation: "Promotional discount of 20% still applied after expiration of agreed 3-month launch period.",
    recommendedAction: "Update subscription line items to standard catalog price of ₹2,999/month.",
    status: "open",
    detectedAt: "2026-10-29T11:30:00Z",
  },
  {
    id: "alert-6",
    type: "duplicate_billing",
    severity: "high",
    customer: {
      id: "cust-108",
      name: "Ananya Roy",
      email: "ananya@tatadigital.com",
      company: "Tata Digital",
    },
    entityType: "invoice",
    entityId: "inv-144",
    revenueAtRisk: 29990,
    explanation: "Two draft invoices generated covering identical period (2026-12-12 to 2027-12-11).",
    recommendedAction: "Void duplicate invoice draft to eliminate risk of double debiting customer.",
    status: "open",
    detectedAt: "2026-10-31T09:15:00Z",
  },
  {
    id: "alert-7",
    type: "overdue_invoice",
    severity: "medium",
    customer: {
      id: "cust-105",
      name: "Deepak Verma",
      email: "d.verma@zerodha.in",
      company: "Zerodha Broking Ltd",
    },
    entityType: "invoice",
    entityId: "inv-122",
    revenueAtRisk: 3999,
    explanation: "Quarterly invoice INV-000122 was overdue by 3 days.",
    recommendedAction: "Resolved: Received direct NEFT transfer and reconciled manually.",
    status: "resolved",
    detectedAt: "2026-10-24T08:00:00Z",
  },
];

/**
 * Calculates total revenue at risk.
 * Strict rule: Count each invoice or subscription only once.
 * If several alerts hit the same entity, use the highest-severity alert's amount.
 */
export function calculateDeduplicatedRevenueAtRisk(alerts: LeakAlert[]): number {
  const severityRank: Record<LeakAlertSeverity, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  // Only consider open alerts for active revenue at risk
  const openAlerts = alerts.filter((a) => a.status === "open");

  // Map each unique entity (entityType:entityId) to its highest-severity alert
  const entityMap = new Map<string, { severity: number; amount: number }>();

  for (const alert of openAlerts) {
    const key = `${alert.entityType}:${alert.entityId}`;
    const currentRank = severityRank[alert.severity];
    const existing = entityMap.get(key);

    if (!existing) {
      entityMap.set(key, { severity: currentRank, amount: alert.revenueAtRisk });
    } else {
      // If higher severity, overwrite amount with this alert's amount
      if (currentRank > existing.severity) {
        entityMap.set(key, { severity: currentRank, amount: alert.revenueAtRisk });
      } else if (currentRank === existing.severity) {
        // If equal severity, choose the higher amount
        entityMap.set(key, {
          severity: currentRank,
          amount: Math.max(existing.amount, alert.revenueAtRisk),
        });
      }
    }
  }

  // Sum unique entity amounts
  let total = 0;
  entityMap.forEach((val) => {
    total += val.amount;
  });

  return Math.round(total);
}

/**
 * Fetch leak radar alerts and summary.
 * Queries Supabase data when available, with automatic fallback to mock alerts.
 */
export async function getLeakRadarData(): Promise<LeakRadarSummary> {
  const env = getSupabaseEnv();

  if (!env) {
    return buildSummaryFromAlerts(MOCK_LEAK_ALERTS, "mock");
  }

  try {
    const supabase = await createClient();

    // 1. Fetch overdue invoices from view
    const { data: overdueInvoices } = await supabase
      .from("overdue_invoices")
      .select("id, invoice_number, customer_id, subscription_id, status, due_date, amount_due, days_overdue, customers(name, email, company)")
      .limit(20);

    // 2. Fetch failed payments
    const { data: failedPayments } = await supabase
      .from("payments")
      .select("id, invoice_id, amount, created_at, customers(name, email, company)")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(10);

    // 3. Fetch expiring/past-due subscriptions
    const { data: subsData } = await supabase
      .from("subscriptions")
      .select("id, subscription_number, status, next_billing_date, cancel_at_period_end, current_period_end, customers(name, email, company)")
      .or("status.eq.past_due,cancel_at_period_end.eq.true")
      .limit(15);

    const liveAlerts: LeakAlert[] = [];

    // Map overdue invoices to alerts
    if (overdueInvoices && overdueInvoices.length > 0) {
      overdueInvoices.forEach((inv: Record<string, unknown>, idx: number) => {
        const cust = (inv.customers as Record<string, string>) || {};
        const days = Number(inv.days_overdue) || 1;
        const amount = Number(inv.amount_due) || 0;
        liveAlerts.push({
          id: `live-inv-${inv.id || idx}`,
          type: "overdue_invoice",
          severity: days > 14 ? "high" : "medium",
          customer: {
            name: cust.name || "Customer",
            email: cust.email || "",
            company: cust.company || null,
          },
          entityType: "invoice",
          entityId: String(inv.id),
          revenueAtRisk: amount,
          explanation: `Invoice ${inv.invoice_number || "INV"} is ${days} days past due date with ₹${amount} unpaid.`,
          recommendedAction: "Send dunning reminder with one-click payment link.",
          status: "open",
          detectedAt: String(inv.due_date || new Date().toISOString()),
        });
      });
    }

    // Map failed payments
    if (failedPayments && failedPayments.length > 0) {
      failedPayments.forEach((pay: Record<string, unknown>, idx: number) => {
        const cust = (pay.customers as Record<string, string>) || {};
        const amount = Number(pay.amount) || 0;
        liveAlerts.push({
          id: `live-pay-${pay.id || idx}`,
          type: "failed_payment",
          severity: "high",
          customer: {
            name: cust.name || "Customer",
            email: cust.email || "",
            company: cust.company || null,
          },
          entityType: "invoice",
          entityId: String(pay.invoice_id || pay.id),
          revenueAtRisk: amount,
          explanation: `Payment of ₹${amount} failed on auto-charge attempt.`,
          recommendedAction: "Prompt customer to update card or retry alternative payment method.",
          status: "open",
          detectedAt: String(pay.created_at || new Date().toISOString()),
        });
      });
    }

    // Map subscriptions
    if (subsData && subsData.length > 0) {
      subsData.forEach((sub: Record<string, unknown>, idx: number) => {
        const cust = (sub.customers as Record<string, string>) || {};
        const isPastDue = sub.status === "past_due";
        liveAlerts.push({
          id: `live-sub-${sub.id || idx}`,
          type: isPastDue ? "missed_renewal" : "upcoming_expiry",
          severity: isPastDue ? "high" : "medium",
          customer: {
            name: cust.name || "Customer",
            email: cust.email || "",
            company: cust.company || null,
          },
          entityType: "subscription",
          entityId: String(sub.id),
          revenueAtRisk: 1499,
          explanation: isPastDue
            ? `Subscription ${sub.subscription_number} is past due after billing attempt.`
            : `Subscription ${sub.subscription_number} is scheduled for cancellation at period end.`,
          recommendedAction: isPastDue
            ? "Retry collection and notify account owner."
            : "Engage customer with retention offer before scheduled cancellation.",
          status: "open",
          detectedAt: new Date().toISOString(),
        });
      });
    }

    if (liveAlerts.length === 0) {
      return buildSummaryFromAlerts(MOCK_LEAK_ALERTS, "mock");
    }

    return buildSummaryFromAlerts(liveAlerts, "live");
  } catch {
    return buildSummaryFromAlerts(MOCK_LEAK_ALERTS, "mock");
  }
}

function buildSummaryFromAlerts(alerts: LeakAlert[], source: "live" | "mock"): LeakRadarSummary {
  const totalRevenueAtRisk = calculateDeduplicatedRevenueAtRisk(alerts);
  const openAlerts = alerts.filter((a) => a.status === "open");

  return {
    totalRevenueAtRisk,
    totalAlerts: alerts.length,
    highSeverityCount: openAlerts.filter((a) => a.severity === "high").length,
    mediumSeverityCount: openAlerts.filter((a) => a.severity === "medium").length,
    lowSeverityCount: openAlerts.filter((a) => a.severity === "low").length,
    openCount: openAlerts.length,
    resolvedCount: alerts.filter((a) => a.status === "resolved").length,
    alerts,
    dataSource: source,
  };
}
