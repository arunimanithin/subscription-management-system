"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Repeat,
  Calendar,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { PortalCustomerData } from "../services/portal-data";
import { calculateHealthScore } from "@/features/intelligence/services/healthScore";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { InvoiceModal } from "./invoice-modal";
import type { Invoice } from "@/types";

interface PortalOverviewViewProps {
  data: PortalCustomerData;
}

export function PortalOverviewView({ data }: PortalOverviewViewProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Compute dynamic health score for customer's primary subscription
  const primarySub = data.subscriptions[0];
  const healthResult = calculateHealthScore({
    status: primarySub?.status || "active",
    expiryDate: primarySub?.current_period_end || null,
    invoices: data.invoices.map((inv) => ({
      id: inv.id,
      status: inv.status,
      due_date: inv.due_date,
      amount_due: inv.amount_due,
    })),
    payments: data.payments.map((p) => ({
      invoice_id: p.invoice_id,
      status: p.status,
      paid_at: p.paid_at,
    })),
  });

  const nextRenewal = [...data.upcomingRenewals].sort((left, right) => left.days_left - right.days_left)[0];

  return (
    <div className="space-y-8">
      {/* Customer Hero Banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#0A2540] via-[#103254] to-[#1E3A8A] p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#00D4B2]/15 px-2.5 py-0.5 text-xs font-semibold text-[#00D4B2]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified Customer Account
              </span>
              {data.customer.tax_id && (
                <span className="hidden sm:inline-block rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                  GST: {data.customer.tax_id}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {data.customer.name}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-300">
              {data.customer.company && (
                <div className="flex items-center gap-1 font-medium text-white">
                  <Building2 className="h-3.5 w-3.5 text-[#00D4B2]" />
                  <span>{data.customer.company}</span>
                  <span>•</span>
                </div>
              )}
              <span>{data.customer.email}</span>
            </div>
          </div>

          {/* Dynamic Health Score Card */}
          <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3.5 border border-white/15">
            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 block">
                Account Health
              </span>
              <span className="text-xl font-extrabold text-white">
                {healthResult.score}/100
              </span>
              <span className="block text-[10px] font-semibold text-[#00D4B2]">
                {healthResult.category}
              </span>
            </div>
            <div className="h-10 w-1 rounded-full bg-[#00D4B2]" />
          </div>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Active Subscriptions Card */}
        <div className="rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Services</span>
            <div className="rounded-lg bg-[#635BFF]/10 p-2 text-[#635BFF]">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {data.subscriptions.length}
            </span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              In Good Standing
            </span>
          </div>
          <Link
            href="/customer-portal/subscriptions"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#635BFF] hover:underline"
          >
            Manage subscriptions
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Next Renewal Date */}
        <div className="rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Next Auto-Renewal</span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {nextRenewal ? (
              <div>
                <span className="text-2xl font-bold text-slate-900">
                  {formatDate(nextRenewal.renewal_date)}
                </span>
                <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  in {nextRenewal.days_left} days
                </span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-slate-900">None Scheduled</span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {nextRenewal ? `Estimated charge: ${formatCurrency(nextRenewal.amount)}` : "No pending renewals"}
          </p>
        </div>

        {/* Outstanding Balance */}
        <div className="rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Due</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(data.outstandingBalance)}
            </span>
            {data.outstandingBalance === 0 ? (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Zero Balance Due
              </span>
            ) : (
              <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                Payment Required
              </span>
            )}
          </div>
          <Link
            href="/customer-portal/invoices"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#635BFF] hover:underline"
          >
            View invoices & payments
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your subscriptions</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {data.subscriptions.length} subscription{data.subscriptions.length === 1 ? "" : "s"} on your account
            </p>
          </div>
          <Link
            href="/customer-portal/subscriptions"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#635BFF] hover:underline"
          >
            Manage subscriptions
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {data.subscriptions.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Repeat className="mx-auto h-8 w-8 stroke-1 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">No subscriptions yet</p>
            <p className="mt-1 text-xs text-slate-500">Your subscriptions will appear here when available.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.subscriptions.map((sub) => (
              <div key={sub.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{sub.plan_name}</p>
                    <StatusBadge status={sub.status} />
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{sub.subscription_number}</p>
                </div>
                <div className="text-xs text-slate-500 sm:text-right">
                  <p className="font-medium text-slate-700">
                    {sub.next_billing_date ? `Next renewal ${formatDate(sub.next_billing_date)}` : "No renewal scheduled"}
                  </p>
                  <p className="mt-0.5 capitalize">Billed {sub.interval_count > 1 ? `every ${sub.interval_count} ` : ""}{sub.billing_interval}{sub.interval_count > 1 ? "s" : "ly"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Renewals (Next 30 Days) Section */}
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#635BFF]" />
            <h2 className="text-base font-bold text-slate-900">Upcoming Renewals (Next 30 Days)</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {data.upcomingRenewals.length} upcoming cycle{data.upcomingRenewals.length === 1 ? "" : "s"}
          </span>
        </div>

        {data.upcomingRenewals.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No subscriptions scheduled to renew in the next 30 days.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.upcomingRenewals.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:bg-white"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{r.subscription_number}</span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      in {r.days_left}d
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-900">{r.plan_name}</p>
                  <p className="text-[11px] text-slate-500">Renewal date: {formatDate(r.renewal_date)}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(r.amount)}</span>
                  <p className="text-[10px] text-emerald-600 font-medium">Auto-renew active</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Invoices Table */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#635BFF]" />
            <h2 className="text-base font-bold text-slate-900">Recent Invoices</h2>
          </div>
          <Link
            href="/customer-portal/invoices"
            className="text-xs font-semibold text-[#635BFF] hover:underline"
          >
            View all invoices
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    <p className="text-sm font-semibold text-slate-700">No invoices yet</p>
                    <p className="mt-1 text-xs text-slate-500">Your recent invoices will appear here.</p>
                  </td>
                </tr>
              ) : data.invoices.slice(0, 3).map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">{inv.invoice_number}</td>
                  <td className="py-3 px-4 text-slate-600">{formatDate(inv.issue_date)}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    {formatCurrency(inv.total)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(inv)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#635BFF] hover:underline"
                    >
                      <span>Preview</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal for Preview / Print */}
      <InvoiceModal
        invoice={selectedInvoice}
        customer={data.customer}
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
