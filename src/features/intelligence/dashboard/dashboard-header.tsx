"use client";

import { Calendar, ShieldCheck, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  dataSource: "live" | "mock";
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DashboardHeader({ dataSource, onRefresh, isRefreshing }: DashboardHeaderProps) {
  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Admin Intelligence Dashboard
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            {dataSource === "live" ? "Live Database" : "Intelligence Active"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Real-time visibility into subscription health, recurring revenue, renewals, and leak prevention.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-xs">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{todayFormatted}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-slate-700">Admin Role</span>
        </div>

        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="h-8 gap-1.5 text-xs hidden md:inline-flex"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </div>
  );
}
