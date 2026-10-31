"use client";

import { useState } from "react";
import { Radar, RefreshCw, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { LeakRadarSummary } from "../services/leak-radar-service";
import { calculateDeduplicatedRevenueAtRisk } from "../services/leak-radar-service";
import { RadarSummaryCards } from "./radar-summary-cards";
import { RadarAlertsList } from "./radar-alerts-list";
import { Button } from "@/components/ui/button";

interface LeakRadarViewProps {
  initialSummary: LeakRadarSummary;
}

export function LeakRadarView({ initialSummary }: LeakRadarViewProps) {
  const [summary, setSummary] = useState<LeakRadarSummary>(initialSummary);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleToggleStatus = (alertId: string) => {
    setSummary((prev) => {
      const updatedAlerts = prev.alerts.map((alert) => {
        if (alert.id === alertId) {
          return {
            ...alert,
            status: alert.status === "open" ? ("resolved" as const) : ("open" as const),
          };
        }
        return alert;
      });

      const newTotal = calculateDeduplicatedRevenueAtRisk(updatedAlerts);
      const openAlerts = updatedAlerts.filter((a) => a.status === "open");

      return {
        ...prev,
        totalRevenueAtRisk: newTotal,
        alerts: updatedAlerts,
        openCount: openAlerts.length,
        resolvedCount: updatedAlerts.filter((a) => a.status === "resolved").length,
        highSeverityCount: openAlerts.filter((a) => a.severity === "high").length,
        mediumSeverityCount: openAlerts.filter((a) => a.severity === "medium").length,
        lowSeverityCount: openAlerts.filter((a) => a.severity === "low").length,
      };
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulated refresh for instant feedback
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Overview
            </Link>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <div className="rounded-lg bg-rose-500/10 p-1.5 text-rose-600">
              <Radar className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Revenue Leak Radar
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600 animate-pulse" />
              Active Scanner
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time audit of overdue invoices, failed auto-charges, missed renewal cycles, and anomalous discount usage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Scan Radar
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards with Deduplicated Total */}
      <RadarSummaryCards
        summary={summary}
        selectedSeverity={selectedSeverity}
        onSelectSeverity={setSelectedSeverity}
      />

      {/* Filterable Alerts List */}
      <RadarAlertsList
        alerts={summary.alerts}
        selectedSeverity={selectedSeverity}
        onClearSeverityFilter={() => setSelectedSeverity(null)}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
