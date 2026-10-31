"use client";

import { useState, useMemo } from "react";
import {
  calculateHealthScore,
  type HealthScoreCategory,
  type HealthScoreInput,
  type HealthScoreResult,
} from "../services/healthScore";
import type { Invoice, Payment, Subscription } from "@/types";
import { ChevronDown, ChevronUp, HeartPulse, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HealthBadgeProps {
  status?: Subscription["status"] | "closed";
  expiryDate?: string | null;
  invoices?: Pick<Invoice, "id" | "status" | "due_date" | "amount_due">[];
  payments?: Pick<Payment, "invoice_id" | "status" | "paid_at">[];
  asOfDate?: string;
  loading?: boolean;
  className?: string;
}

export function HealthBadge({
  status = "active",
  expiryDate = null,
  invoices = [],
  payments = [],
  asOfDate,
  loading = false,
  className,
}: HealthBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  const result: HealthScoreResult = useMemo(() => {
    const input: HealthScoreInput = {
      status,
      expiryDate,
      invoices,
      payments,
      asOfDate,
    };
    return calculateHealthScore(input);
  }, [status, expiryDate, invoices, payments, asOfDate]);

  if (loading) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs text-slate-400 animate-pulse",
          className
        )}
      >
        <HeartPulse className="h-3 w-3" />
        <span>Calculating Health...</span>
      </div>
    );
  }

  const getCategoryStyles = (category: HealthScoreCategory) => {
    switch (category) {
      case "Healthy":
        return {
          badge: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-600/20",
          icon: <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />,
          dot: "bg-emerald-500",
        };
      case "Needs Attention":
        return {
          badge: "bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-600/20",
          icon: <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />,
          dot: "bg-amber-500",
        };
      case "At Risk":
        return {
          badge: "bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-600/20",
          icon: <AlertOctagon className="h-3 w-3 text-rose-600 shrink-0" />,
          dot: "bg-rose-500",
        };
    }
  };

  const styles = getCategoryStyles(result.category);

  return (
    <div className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all hover:shadow-xs focus:outline-none cursor-pointer",
          styles.badge
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
        <span className="font-mono font-bold">{result.score}/100</span>
        <span>{result.category}</span>
        {expanded ? (
          <ChevronUp className="h-3 w-3 ml-0.5 opacity-70" />
        ) : (
          <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
        )}
      </button>

      {/* Expandable Reasons List */}
      {expanded && (
        <div className="absolute left-0 mt-1.5 z-50 w-72 sm:w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              {styles.icon}
              <span>Health Score Breakdown</span>
            </div>
            <span className="font-mono font-bold text-slate-700">{result.score}/100</span>
          </div>

          <p className="text-[11px] text-slate-500 font-medium">Scoring factors & audit reasons:</p>

          <ul className="space-y-1.5 pt-0.5">
            {result.reasons.map((reason, idx) => {
              const isPositive = reason.startsWith("+") || reason.includes("No issues");
              const isNeutral = reason.includes("No issues");
              return (
                <li
                  key={idx}
                  className={cn(
                    "flex items-start gap-1.5 rounded-md px-2 py-1 text-[11px]",
                    isNeutral
                      ? "bg-slate-50 text-slate-600"
                      : isPositive
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-rose-50 text-rose-800"
                  )}
                >
                  <span className="font-semibold select-none">•</span>
                  <span className="leading-snug">{reason}</span>
                </li>
              );
            })}
          </ul>

          <div className="border-t pt-1.5 text-[10px] text-slate-400 text-right">
            Calculated via intelligence health engine
          </div>
        </div>
      )}
    </div>
  );
}
