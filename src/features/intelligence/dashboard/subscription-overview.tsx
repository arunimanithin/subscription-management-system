"use client";

import { useState, useMemo } from "react";
import { Search, Filter, ExternalLink, Calendar, Building2 } from "lucide-react";
import type { DashboardSubscriptionItem } from "../services/mock-data";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import Link from "next/link";

interface SubscriptionOverviewProps {
  subscriptions: DashboardSubscriptionItem[];
}

type FilterTab = "all" | "active" | "trialing" | "past_due" | "paused";

export function SubscriptionOverview({ subscriptions }: SubscriptionOverviewProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const counts = useMemo(() => {
    return {
      all: subscriptions.length,
      active: subscriptions.filter((s) => s.status === "active").length,
      trialing: subscriptions.filter((s) => s.status === "trialing").length,
      past_due: subscriptions.filter((s) => s.status === "past_due").length,
      paused: subscriptions.filter((s) => s.status === "paused").length,
    };
  }, [subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      // Tab filter
      if (activeTab !== "all" && sub.status !== activeTab) return false;

      // Text search
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      return (
        sub.subscription_number.toLowerCase().includes(query) ||
        sub.customer_name.toLowerCase().includes(query) ||
        sub.customer_email.toLowerCase().includes(query) ||
        (sub.company && sub.company.toLowerCase().includes(query)) ||
        sub.plan_name.toLowerCase().includes(query)
      );
    });
  }, [subscriptions, activeTab, search]);

  const getDaysUntilRenewal = (dateStr: string) => {
    if (!dateStr) return null;
    const diffTime = new Date(dateStr).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
      {/* Header & Controls */}
      <div className="p-5 border-b space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Subscription Overview</h2>
            <p className="text-xs text-muted-foreground">
              Real-time directory of customer accounts, plan tiers, and lifecycle statuses
            </p>
          </div>
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            Manage all in Subscriptions
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: "All", count: counts.all },
                { id: "active", label: "Active", count: counts.active },
                { id: "trialing", label: "Trialing", count: counts.trialing },
                { id: "past_due", label: "Past Due", count: counts.past_due },
                { id: "paused", label: "Paused", count: counts.paused },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, ID, company..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">Subscription</th>
              <th className="py-3 px-4">Customer & Account</th>
              <th className="py-3 px-4">Plan & Cadence</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Next Renewal</th>
              <th className="py-3 px-4 text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredSubscriptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Filter className="h-8 w-8 stroke-1 text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-700">No subscriptions found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No matching subscriptions for &quot;{search}&quot; in tab &quot;{activeTab}&quot;.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredSubscriptions.map((sub) => {
                const days = getDaysUntilRenewal(sub.next_billing_date);
                return (
                  <tr key={sub.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {sub.subscription_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-slate-900">{sub.customer_name}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          {sub.company && (
                            <>
                              <Building2 className="h-3 w-3 text-slate-400" />
                              <span>{sub.company}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{sub.customer_email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-medium text-slate-900">{sub.plan_name}</span>
                        <p className="text-[11px] capitalize text-slate-500">Billed {sub.billing_interval}ly</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-700">{formatDate(sub.next_billing_date)}</span>
                        {days !== null && days <= 7 && days >= 0 && (
                          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                            in {days}d
                          </span>
                        )}
                        {days !== null && days < 0 && (
                          <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 border border-rose-200">
                            overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(sub.amount)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
