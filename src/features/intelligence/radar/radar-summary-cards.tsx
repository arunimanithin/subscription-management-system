import { AlertOctagon, AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { LeakRadarSummary } from "../services/leak-radar-service";
import { formatCurrency, formatNumber } from "@/lib/format";

interface RadarSummaryCardsProps {
  summary: LeakRadarSummary;
  selectedSeverity: string | null;
  onSelectSeverity: (sev: string | null) => void;
}

export function RadarSummaryCards({
  summary,
  selectedSeverity,
  onSelectSeverity,
}: RadarSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Revenue-at-Risk Primary Card */}
      <div className="relative overflow-hidden rounded-xl border border-rose-200 bg-rose-50/50 p-5 shadow-xs transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-rose-900">Total Revenue At Risk</span>
          <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-rose-700">
            {formatCurrency(summary.totalRevenueAtRisk)}
          </span>
        </div>
        <div className="mt-2 text-xs text-rose-600/90 font-medium">
          Deduplicated across {summary.openCount} open leak incidents
        </div>
      </div>

      {/* 2. High Severity Alerts Card */}
      <button
        type="button"
        onClick={() => onSelectSeverity(selectedSeverity === "high" ? null : "high")}
        className={`text-left relative overflow-hidden rounded-xl border p-5 shadow-xs transition-all hover:shadow-md cursor-pointer ${
          selectedSeverity === "high"
            ? "ring-2 ring-rose-500 bg-rose-50/30 border-rose-300"
            : "bg-card border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">High Severity</span>
          <div className="rounded-lg bg-rose-100 p-2 text-rose-600">
            <AlertOctagon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-rose-600">
            {formatNumber(summary.highSeverityCount)}
          </span>
          <span className="text-xs text-rose-600/80 font-medium">Critical Attention</span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Failed charges & duplicate billings
        </div>
      </button>

      {/* 3. Medium Severity Alerts Card */}
      <button
        type="button"
        onClick={() => onSelectSeverity(selectedSeverity === "medium" ? null : "medium")}
        className={`text-left relative overflow-hidden rounded-xl border p-5 shadow-xs transition-all hover:shadow-md cursor-pointer ${
          selectedSeverity === "medium"
            ? "ring-2 ring-amber-500 bg-amber-50/30 border-amber-300"
            : "bg-card border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Medium Severity</span>
          <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-amber-600">
            {formatNumber(summary.mediumSeverityCount)}
          </span>
          <span className="text-xs text-amber-600/80 font-medium">At Risk</span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Overdue invoices & expiring trials
        </div>
      </button>

      {/* 4. Low Severity & Resolution Ratio Card */}
      <button
        type="button"
        onClick={() => onSelectSeverity(selectedSeverity === "low" ? null : "low")}
        className={`text-left relative overflow-hidden rounded-xl border p-5 shadow-xs transition-all hover:shadow-md cursor-pointer ${
          selectedSeverity === "low"
            ? "ring-2 ring-blue-500 bg-blue-50/30 border-blue-300"
            : "bg-card border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Low Severity</span>
          <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
            <AlertCircle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-blue-600">
            {formatNumber(summary.lowSeverityCount)}
          </span>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {summary.resolvedCount} Resolved
          </span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Discounts & minor variance
        </div>
      </button>
    </div>
  );
}
