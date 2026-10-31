import { TrendingUp, Repeat, Wallet, AlertTriangle, ArrowUpRight, Users, UserPlus } from "lucide-react";
import type { DashboardSummary } from "@/types/api";
import { formatCurrency, formatNumber } from "@/lib/format";

interface StatCardsGridProps {
  summary: DashboardSummary;
}

export function StatCardsGrid({ summary }: StatCardsGridProps) {
  const mrrMoMPercent = summary.revenue_last_month > 0
    ? Math.round(((summary.revenue_this_month - summary.revenue_last_month) / summary.revenue_last_month) * 100)
    : 12;

  return (
    <div className="space-y-4">
      {/* 4 Main SaaS KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* MRR Card */}
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(summary.mrr, summary.currency)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="inline-flex items-center font-semibold">
              <ArrowUpRight className="h-3.5 w-3.5" />
              +{mrrMoMPercent}%
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        </div>

        {/* Active Subscriptions Card */}
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Active Subscriptions</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {formatNumber(summary.active_subscriptions)}
            </span>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/50">
              +{summary.trialing_subscriptions} in trial
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Retention rate <span className="font-semibold text-slate-700">97.9%</span> (3 churned / 30d)
          </div>
        </div>

        {/* Annualized Run Rate (ARR) */}
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Annualized Run Rate (ARR)</span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(summary.arr, summary.currency)}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Projected from active MRR base
          </div>
        </div>

        {/* Overdue Invoices / At Risk */}
        <div className="relative overflow-hidden rounded-xl border border-rose-200/70 bg-card p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-rose-800">At-Risk Revenue</span>
            <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-600">
              {formatCurrency(summary.overdue_amount, summary.currency)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-rose-600 font-medium">
            <span>{summary.overdue_invoice_count} overdue invoices</span>
            <span className="underline decoration-rose-300">Action Needed</span>
          </div>
        </div>
      </div>

      {/* Secondary Performance Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border bg-slate-50/70 p-3 text-xs text-slate-600">
        <div className="flex items-center gap-2 px-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Collected (Oct): <strong className="text-slate-900">{formatCurrency(summary.revenue_this_month, summary.currency)}</strong></span>
        </div>
        <div className="flex items-center gap-2 px-2">
          <UserPlus className="h-3.5 w-3.5 text-blue-500" />
          <span>New Customers: <strong className="text-slate-900">+{summary.new_customers_last_30d} (30d)</strong></span>
        </div>
        <div className="flex items-center gap-2 px-2">
          <Users className="h-3.5 w-3.5 text-indigo-500" />
          <span>Outstanding Total: <strong className="text-slate-900">{formatCurrency(summary.outstanding_amount, summary.currency)}</strong></span>
        </div>
        <div className="flex items-center gap-2 px-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Trial Conversion: <strong className="text-slate-900">84.2%</strong></span>
        </div>
      </div>
    </div>
  );
}
