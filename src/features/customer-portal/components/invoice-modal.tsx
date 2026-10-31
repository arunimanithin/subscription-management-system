"use client";

import { Printer, X, Repeat2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Customer, Invoice } from "@/types";
import { formatCurrency, formatDate } from "@/lib/format";

interface InvoiceModalProps {
  invoice: Invoice | null;
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceModal({ invoice, customer, isOpen, onClose }: InvoiceModalProps) {
  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 print:p-0 print:border-none print:shadow-none">
        {/* Controls */}
        <div className="flex items-center justify-between border-b pb-4 print:hidden">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Invoice Preview
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="gap-1.5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div className="mt-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-[#0A2540] text-[#00D4B2]">
                  <Repeat2 className="h-4 w-4" />
                </span>
                <span className="text-lg font-bold text-[#0A2540]">SubscriptIQ Technologies</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                GSTIN: 29AABCS1429B1Z8<br />
                Koramangala 4th Block, Bengaluru, KA 560034
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold font-mono text-slate-900">
                {invoice.invoice_number}
              </span>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <CheckCircle2 className="h-3 w-3" />
                  {invoice.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Customer and Dates */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs">
            <div>
              <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                Billed To
              </span>
              <p className="mt-1 font-bold text-slate-900">{customer.name}</p>
              {customer.company && <p className="text-slate-700">{customer.company}</p>}
              <p className="text-slate-500">{customer.email}</p>
              {customer.tax_id && <p className="text-slate-500 font-mono">Tax ID: {customer.tax_id}</p>}
            </div>

            <div className="text-right space-y-1">
              <div>
                <span className="text-slate-500 text-[11px]">Issue Date:</span>{" "}
                <strong className="text-slate-900">{formatDate(invoice.issue_date)}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Due Date:</span>{" "}
                <strong className="text-slate-900">{formatDate(invoice.due_date)}</strong>
              </div>
              {invoice.paid_at && (
                <div>
                  <span className="text-slate-500 text-[11px]">Paid At:</span>{" "}
                  <strong className="text-emerald-700">{formatDate(invoice.paid_at)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-2.5">Description</th>
                <th className="py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3">
                  <p className="font-semibold text-slate-900">Subscription Service Charge</p>
                  <p className="text-[11px] text-slate-500">
                    Cycle: {invoice.period_start ? formatDate(invoice.period_start) : "Current"} -{" "}
                    {invoice.period_end ? formatDate(invoice.period_end) : "Next"}
                  </p>
                </td>
                <td className="py-3 text-right font-medium text-slate-900">
                  {formatCurrency(invoice.subtotal)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td className="pt-3 text-slate-500">Subtotal</td>
                <td className="pt-3 text-right font-semibold text-slate-900">
                  {formatCurrency(invoice.subtotal)}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500">Taxes (GST 18%)</td>
                <td className="py-1 text-right font-semibold text-slate-900">
                  {formatCurrency(invoice.tax_total)}
                </td>
              </tr>
              <tr className="border-t font-bold text-sm text-slate-900">
                <td className="pt-2">Total Amount</td>
                <td className="pt-2 text-right">{formatCurrency(invoice.total)}</td>
              </tr>
              <tr className="text-emerald-700 font-semibold">
                <td className="py-1">Amount Paid</td>
                <td className="py-1 text-right">{formatCurrency(invoice.amount_paid)}</td>
              </tr>
              <tr className="border-t text-xs font-semibold text-slate-700">
                <td className="pt-2">Balance Due</td>
                <td className="pt-2 text-right">{formatCurrency(invoice.amount_due)}</td>
              </tr>
            </tfoot>
          </table>

          {invoice.notes && (
            <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
              <strong>Notes:</strong> {invoice.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
