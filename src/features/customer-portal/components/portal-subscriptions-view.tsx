"use client";

import {
  Repeat,
  Calendar,
  PlusCircle,
} from "lucide-react";
import type { PortalCustomerData } from "../services/portal-data";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface PortalSubscriptionsViewProps {
  data: PortalCustomerData;
}

export function PortalSubscriptionsView({ data }: PortalSubscriptionsViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Subscriptions
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          View active plan specifications, renewal intervals, manage add-ons, or request plan modifications.
        </p>
      </div>

      {/* Subscriptions List */}
      <div className="space-y-4">
        {data.subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="rounded-2xl border border-slate-200 bg-card p-6 shadow-xs transition-all hover:shadow-md"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              {/* Left details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {sub.subscription_number}
                  </span>
                  <StatusBadge status={sub.status} />
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 capitalize">
                    Billed {sub.billing_interval}ly
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{sub.plan_name}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1">
                    <Repeat className="h-3.5 w-3.5 text-slate-400" />
                    <span>Started: {formatDate(sub.start_date)}</span>
                  </div>
                  {sub.next_billing_date && (
                    <div className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="h-3.5 w-3.5 text-[#635BFF]" />
                      <span>Next renewal: {formatDate(sub.next_billing_date)}</span>
                    </div>
                  )}
                  {sub.current_period_end && (
                    <div className="flex items-center gap-1">
                      <span>Period ends: {formatDate(sub.current_period_end)}</span>
                    </div>
                  )}
                </div>

                {/* Items summary */}
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs space-y-1">
                  <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">
                    Included Components
                  </span>
                  {sub.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-slate-600">
                      <span>
                        {item.description} (x{item.quantity})
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions panel */}
              <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0">
                {/* Upgrade/Downgrade button */}
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  title="Coming soon"
                  className="text-xs text-slate-400 w-full sm:w-auto"
                >
                  Upgrade / downgrade: Coming soon
                </Button>

                {/* Manage Add-ons button (Coming soon as required when API is not ready) */}
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  title="Coming soon"
                  className="gap-1.5 text-xs text-slate-400 w-full sm:w-auto"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Add-ons: Coming soon</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled
                  title="Coming soon"
                  className="gap-1.5 text-xs text-slate-400 w-full sm:w-auto"
                >
                  <span>Cancellation: Coming soon</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
