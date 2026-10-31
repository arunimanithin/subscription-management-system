import type { DashboardSummary } from "@/types/api";

export interface DashboardSubscriptionItem {
  id: string;
  subscription_number: string;
  customer_name: string;
  customer_email: string;
  company: string | null;
  plan_name: string;
  billing_interval: "week" | "month" | "quarter" | "year";
  amount: number;
  status: "draft" | "trialing" | "active" | "paused" | "past_due" | "cancelled" | "expired";
  next_billing_date: string;
  start_date: string;
}

export interface RecentActivityItem {
  id: string;
  type: "payment_success" | "subscription_created" | "invoice_overdue" | "subscription_renewed" | "quotation_converted" | "payment_failed";
  title: string;
  description: string;
  amount?: string;
  timestamp: string;
  badge: string;
  tone?: "default" | "success" | "danger" | "warning";
}

export interface RevenueTrendPoint {
  month: string;
  invoiced: number;
  collected: number;
}

export const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  currency: "INR",
  mrr: 485200,
  arr: 5822400,
  active_subscriptions: 142,
  trialing_subscriptions: 18,
  cancelled_last_30d: 3,
  new_customers_last_30d: 24,
  revenue_this_month: 512400,
  revenue_last_month: 455800,
  outstanding_amount: 64500,
  overdue_amount: 28900,
  overdue_invoice_count: 4,
};

export const MOCK_REVENUE_TREND: RevenueTrendPoint[] = [
  { month: "May 2026", invoiced: 340000, collected: 325000 },
  { month: "Jun 2026", invoiced: 385000, collected: 372000 },
  { month: "Jul 2026", invoiced: 410000, collected: 398000 },
  { month: "Aug 2026", invoiced: 432000, collected: 421000 },
  { month: "Sep 2026", invoiced: 455800, collected: 449000 },
  { month: "Oct 2026", invoiced: 528000, collected: 512400 },
];

export const MOCK_SUBSCRIPTIONS: DashboardSubscriptionItem[] = [
  {
    id: "sub-101",
    subscription_number: "SUB-000101",
    customer_name: "Rahul Sharma",
    customer_email: "rahul@acmecorp.in",
    company: "Acme Corp India",
    plan_name: "Analytics Team",
    billing_interval: "month",
    amount: 2999,
    status: "active",
    next_billing_date: "2026-11-03",
    start_date: "2026-05-03",
  },
  {
    id: "sub-102",
    subscription_number: "SUB-000102",
    customer_name: "Priya Nair",
    customer_email: "priya.n@infosyslabs.com",
    company: "Infosys Labs",
    plan_name: "Storage Pro",
    billing_interval: "month",
    amount: 1499,
    status: "active",
    next_billing_date: "2026-11-06",
    start_date: "2026-07-06",
  },
  {
    id: "sub-103",
    subscription_number: "SUB-000103",
    customer_name: "Vikram Malhotra",
    customer_email: "v.malhotra@zomato.in",
    company: "Zomato Media Ltd",
    plan_name: "Analytics Team (Annual)",
    billing_interval: "year",
    amount: 29990,
    status: "active",
    next_billing_date: "2026-11-18",
    start_date: "2025-11-18",
  },
  {
    id: "sub-104",
    subscription_number: "SUB-000104",
    customer_name: "Arjun Patel",
    customer_email: "arjun.p@swiggy.in",
    company: "Bundl Technologies",
    plan_name: "Storage Starter",
    billing_interval: "month",
    amount: 499,
    status: "past_due",
    next_billing_date: "2026-10-26",
    start_date: "2026-06-26",
  },
  {
    id: "sub-105",
    subscription_number: "SUB-000105",
    customer_name: "Deepak Verma",
    customer_email: "d.verma@zerodha.in",
    company: "Zerodha Broking Ltd",
    plan_name: "Support Plus",
    billing_interval: "quarter",
    amount: 3999,
    status: "active",
    next_billing_date: "2026-11-24",
    start_date: "2026-02-24",
  },
  {
    id: "sub-106",
    subscription_number: "SUB-000106",
    customer_name: "Sneha Iyer",
    customer_email: "s.iyer@cred.club",
    company: "Dreamplug Technologies",
    plan_name: "Analytics Team",
    billing_interval: "month",
    amount: 2999,
    status: "trialing",
    next_billing_date: "2026-11-04",
    start_date: "2026-10-28",
  },
  {
    id: "sub-107",
    subscription_number: "SUB-000107",
    customer_name: "Karthik R",
    customer_email: "karthik@razorpay.com",
    company: "Razorpay Software",
    plan_name: "Storage Pro",
    billing_interval: "month",
    amount: 1499,
    status: "paused",
    next_billing_date: "2026-11-15",
    start_date: "2026-04-15",
  },
  {
    id: "sub-108",
    subscription_number: "SUB-000108",
    customer_name: "Ananya Roy",
    customer_email: "ananya@tatadigital.com",
    company: "Tata Digital",
    plan_name: "Analytics Team (Annual)",
    billing_interval: "year",
    amount: 29990,
    status: "active",
    next_billing_date: "2026-12-12",
    start_date: "2025-12-12",
  },
];

export const MOCK_RECENT_ACTIVITY: RecentActivityItem[] = [
  {
    id: "act-1",
    type: "payment_success",
    title: "Payment Received",
    description: "Acme Corp settled invoice INV-000142 via UPI",
    amount: "₹2,999",
    timestamp: "12m ago",
    badge: "Payment",
    tone: "success",
  },
  {
    id: "act-2",
    type: "subscription_created",
    title: "New Trial Started",
    description: "CRED Technologies initiated 7-day Analytics Team trial",
    amount: "₹2,999/mo",
    timestamp: "45m ago",
    badge: "Subscription",
    tone: "default",
  },
  {
    id: "act-3",
    type: "invoice_overdue",
    title: "Invoice Past Due",
    description: "Bundl Technologies invoice INV-000138 overdue by 5 days",
    amount: "₹499",
    timestamp: "2h ago",
    badge: "Alert",
    tone: "danger",
  },
  {
    id: "act-4",
    type: "subscription_renewed",
    title: "Subscription Renewed",
    description: "Infosys Labs auto-renewed Storage Pro for November",
    amount: "₹1,499",
    timestamp: "5h ago",
    badge: "Renewal",
    tone: "success",
  },
  {
    id: "act-5",
    type: "quotation_converted",
    title: "Quotation Converted",
    description: "Tata Digital converted quotation QUO-000088 to annual plan",
    amount: "₹29,990",
    timestamp: "Yesterday",
    badge: "Quotation",
    tone: "success",
  },
  {
    id: "act-6",
    type: "payment_failed",
    title: "Card Charge Failed",
    description: "Auto-charge failed for Bundl Technologies (Card Expired)",
    amount: "₹499",
    timestamp: "Yesterday",
    badge: "Payment",
    tone: "danger",
  },
];
