"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  ExternalLink,
  Building2,
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { LeakAlert, LeakAlertSeverity, LeakAlertType } from "../services/leak-radar-service";
import { formatCurrency } from "@/lib/format";

interface RadarAlertsListProps {
  alerts: LeakAlert[];
  selectedSeverity: string | null;
  onClearSeverityFilter: () => void;
  onToggleStatus: (alertId: string) => void;
}

type StatusFilter = "all" | "open" | "resolved";

export function RadarAlertsList({
  alerts,
  selectedSeverity,
  onClearSeverityFilter,
  onToggleStatus,
}: RadarAlertsListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Severity filter from summary cards
      if (selectedSeverity && alert.severity !== selectedSeverity) return false;

      // Status tab filter
      if (statusFilter !== "all" && alert.status !== statusFilter) return false;

      // Alert type dropdown filter
      if (typeFilter !== "all" && alert.type !== typeFilter) return false;

      // Text search query
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        alert.customer.name.toLowerCase().includes(q) ||
        (alert.customer.company && alert.customer.company.toLowerCase().includes(q)) ||
        (alert.customer.email && alert.customer.email.toLowerCase().includes(q)) ||
        alert.entityId.toLowerCase().includes(q) ||
        alert.explanation.toLowerCase().includes(q) ||
        alert.recommendedAction.toLowerCase().includes(q)
      );
    });
  }, [alerts, selectedSeverity, statusFilter, typeFilter, search]);

  const getSeverityBadge = (severity: LeakAlertSeverity) => {
    switch (severity) {
      case "high":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
            <AlertOctagon className="h-3 w-3" />
            High Risk
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <AlertTriangle className="h-3 w-3" />
            Medium Risk
          </span>
        );
      case "low":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <AlertCircle className="h-3 w-3" />
            Low Risk
          </span>
        );
    }
  };

  const getTypeLabel = (type: LeakAlertType) => {
    switch (type) {
      case "overdue_invoice":
        return "Overdue Invoice";
      case "failed_payment":
        return "Failed Payment";
      case "missed_renewal":
        return "Missed Renewal";
      case "upcoming_expiry":
        return "Expiring Subscription";
      case "expired_discount":
        return "Expired Discount";
      case "duplicate_billing":
        return "Duplicate Billing";
      default:
        return "Revenue Anomaly";
    }
  };

  const getEntityHref = (alert: LeakAlert) => {
    if (alert.entityType === "invoice") {
      return `/invoices/${alert.entityId}`;
    }
    return `/subscriptions/${alert.entityId}`;
  };

  return (
    <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
      {/* Header and Filter Controls */}
      <div className="p-5 border-b space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Detected Revenue Leaks</h2>
            <p className="text-xs text-muted-foreground">
              Prioritized anomalies, overdue balances, and dunning triggers across subscriptions and billing
            </p>
          </div>
          {selectedSeverity && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filtered by:</span>
              <span className="text-xs font-semibold uppercase text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                {selectedSeverity} Severity
              </span>
              <button
                type="button"
                onClick={onClearSeverityFilter}
                className="text-xs text-primary hover:underline font-medium"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: "all", label: "All Alerts" },
                { id: "open", label: "Active Leaks" },
                { id: "resolved", label: "Resolved" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-700 focus:border-primary focus:outline-none"
            >
              <option value="all">All Anomaly Types</option>
              <option value="overdue_invoice">Overdue Invoices</option>
              <option value="failed_payment">Failed Payments</option>
              <option value="missed_renewal">Missed Renewals</option>
              <option value="upcoming_expiry">Upcoming Expirations</option>
              <option value="expired_discount">Expired Discounts</option>
              <option value="duplicate_billing">Duplicate Billings</option>
            </select>

            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, action, explanation..."
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-slate-100">
        {filteredAlerts.length === 0 ? (
          <div className="py-14 text-center">
            <div className="flex flex-col items-center justify-center text-slate-400">
              <Filter className="h-10 w-10 stroke-1 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-800">No matching revenue leaks found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                No active or historical anomalies match your current filters. Clear your filters to see all alerts.
              </p>
            </div>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-5 transition-colors ${
                alert.status === "resolved" ? "bg-slate-50/40 opacity-75" : "hover:bg-slate-50/50"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Left block: Identity & Explanation */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(alert.severity)}
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {getTypeLabel(alert.type)}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      #{alert.entityType}:{alert.entityId}
                    </span>
                    {alert.status === "resolved" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <CheckCircle className="h-3 w-3" />
                        Resolved
                      </span>
                    )}
                  </div>

                  {/* Customer Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{alert.customer.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      {alert.customer.company && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span>{alert.customer.company}</span>
                          <span>•</span>
                        </div>
                      )}
                      {alert.customer.email && <span>{alert.customer.email}</span>}
                    </div>
                  </div>

                  {/* Explanation */}
                  <p className="text-xs text-slate-600 leading-relaxed">{alert.explanation}</p>

                  {/* Recommended Action Card */}
                  <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Recommended Recovery Action:
                    </div>
                    <p className="text-slate-600 pl-5">{alert.recommendedAction}</p>
                  </div>
                </div>

                {/* Right block: Revenue Amount, Direct Links & Status Toggle */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0">
                  <div className="text-left lg:text-right">
                    <span className="text-[11px] text-muted-foreground font-medium block">
                      Revenue at Risk
                    </span>
                    <span className="text-lg font-bold tracking-tight text-rose-600">
                      {formatCurrency(alert.revenueAtRisk)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={getEntityHref(alert)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span>View {alert.entityType}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => onToggleStatus(alert.id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        alert.status === "open"
                          ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {alert.status === "open" ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Mark Resolved
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reopen
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
