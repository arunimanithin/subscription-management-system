"use client";

import { Check, Sparkles, X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AVAILABLE_PLANS } from "../services/portal-data";
import { formatCurrency } from "@/lib/format";

interface PlanChangeModalProps {
  currentPlanName: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planName: string) => void;
}

export function PlanChangeModal({
  currentPlanName,
  isOpen,
  onClose,
  onSelectPlan,
}: PlanChangeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-50 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#635BFF]" />
            <h3 className="text-base font-bold text-slate-900">Change Subscription Plan</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Current Plan: <strong className="text-slate-900">{currentPlanName}</strong>. Select an eligible plan below. Prorated balances will automatically adjust on your next billing invoice.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {AVAILABLE_PLANS.filter((p) => !p.isCurrent).map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-[#635BFF] hover:bg-white hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{plan.name}</h4>
                  {plan.savings && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      {plan.savings}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-slate-900">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-xs text-slate-500">/{plan.interval}</span>
                </div>

                <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t">
                {plan.eligibleForUpgrade ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      onSelectPlan(plan.name);
                      onClose();
                    }}
                    className="w-full gap-1.5 bg-[#635BFF] hover:bg-[#5349e0] text-white"
                  >
                    <span>Upgrade to Plan</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled className="w-full text-slate-400">
                    Coming soon
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
