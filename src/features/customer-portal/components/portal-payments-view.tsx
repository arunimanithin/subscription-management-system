"use client";

import {
  CreditCard,
  Smartphone,
  Building2,
  Banknote,
  FileCheck,
  HelpCircle,
  Calendar,
  Hash,
  StickyNote,
} from "lucide-react";
import type { PortalCustomerData } from "../services/portal-data";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PaymentMethod } from "@/types/enums";

interface PortalPaymentsViewProps {
  data: PortalCustomerData;
}

const METHOD_CONFIG: Record<
  PaymentMethod,
  { label: string; Icon: React.ElementType; color: string }
> = {
  card: { label: "Card", Icon: CreditCard, color: "text-blue-600 bg-blue-50" },
  upi: { label: "UPI", Icon: Smartphone, color: "text-emerald-600 bg-emerald-50" },
  bank_transfer: { label: "Bank Transfer", Icon: Building2, color: "text-indigo-600 bg-indigo-50" },
  cash: { label: "Cash", Icon: Banknote, color: "text-amber-600 bg-amber-50" },
  cheque: { label: "Cheque", Icon: FileCheck, color: "text-violet-600 bg-violet-50" },
  other: { label: "Other", Icon: HelpCircle, color: "text-slate-600 bg-slate-100" },
};

function MethodBadge({ method }: { method: string }) {
  const cfg = METHOD_CONFIG[method as PaymentMethod] ?? METHOD_CONFIG.other;
  const { label, Icon, color } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}

export function PortalPaymentsView({ data }: PortalPaymentsViewProps) {
  const payments = data.payments;

  /* ── summary totals ─────────────────────────────────────────────── */
  const totalSucceeded = payments
    .filter((p) => p.status === "succeeded")
    .reduce((s, p) => s + Number(p.amount), 0);

  const totalFailed = payments
    .filter((p) => p.status === "failed")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment History</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          A complete record of every payment transaction associated with your account.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-card p-5 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total Payments
          </p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{payments.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">transactions on record</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
            Total Collected
          </p>
          <p className="mt-1.5 text-2xl font-bold text-emerald-700">
            {formatCurrency(totalSucceeded)}
          </p>
          <p className="mt-0.5 text-xs text-emerald-600">from succeeded payments</p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-500">
            Failed Amount
          </p>
          <p className="mt-1.5 text-2xl font-bold text-red-600">
            {formatCurrency(totalFailed)}
          </p>
          <p className="mt-0.5 text-xs text-red-500">could not be collected</p>
        </div>
      </div>

      {/* Payments Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-card shadow-xs overflow-hidden">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CreditCard className="h-10 w-10 stroke-1 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">No payment records yet</p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              Payment transactions will appear here after your first successful billing cycle.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Method</th>
                  <th className="py-3 px-5">Reference</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                  <th className="py-3 px-5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Date */}
                    <td className="py-4 px-5 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{formatDate(pay.paid_at)}</span>
                      </div>
                    </td>

                    {/* Method */}
                    <td className="py-4 px-5">
                      <MethodBadge method={pay.method} />
                    </td>

                    {/* Reference */}
                    <td className="py-4 px-5">
                      {pay.reference ? (
                        <div className="flex items-center gap-1 font-mono text-slate-700">
                          <Hash className="h-3 w-3 text-slate-400" />
                          <span>{pay.reference}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5">
                      <StatusBadge status={pay.status} />
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-5 text-right font-bold text-slate-900">
                      {formatCurrency(Number(pay.amount))}
                    </td>

                    {/* Notes */}
                    <td className="py-4 px-5 max-w-[220px]">
                      {pay.notes ? (
                        <div className="flex items-start gap-1.5 text-slate-500">
                          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="line-clamp-2">{pay.notes}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">No notes</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="text-center text-[11px] text-slate-400">
        All amounts inclusive of applicable taxes. For disputes, contact{" "}
        <a
          href="mailto:billing@subscriptiq.com"
          className="text-[#635BFF] hover:underline"
        >
          billing@subscriptiq.com
        </a>
      </p>
    </div>
  );
}
