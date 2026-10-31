"use client";

import { useState } from "react";
import {
  FileText,
  Printer,
  Calendar,
  ExternalLink,
} from "lucide-react";
import type { PortalCustomerData } from "../services/portal-data";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { InvoiceModal } from "./invoice-modal";
import type { Invoice } from "@/types";

interface PortalInvoicesViewProps {
  data: PortalCustomerData;
}

export function PortalInvoicesView({ data }: PortalInvoicesViewProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Invoices & Billing Statements
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Access and print official tax invoices, verify payment settlements, or review upcoming due balances.
        </p>
      </div>

      {/* Invoices Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-5">Invoice #</th>
                <th className="py-3 px-5">Issue Date</th>
                <th className="py-3 px-5">Due Date</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Subtotal</th>
                <th className="py-3 px-5 text-right">Tax (GST)</th>
                <th className="py-3 px-5 text-right">Total</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="h-8 w-8 stroke-1 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No invoices generated yet</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Your billing statements will appear here upon completion of each subscription period.
                    </p>
                  </td>
                </tr>
              ) : (
                data.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-slate-900">
                      {inv.invoice_number}
                    </td>
                    <td className="py-4 px-5 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formatDate(inv.issue_date)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-slate-600">{formatDate(inv.due_date)}</td>
                    <td className="py-4 px-5">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-4 px-5 text-right text-slate-600">
                      {formatCurrency(inv.subtotal)}
                    </td>
                    <td className="py-4 px-5 text-right text-slate-600">
                      {formatCurrency(inv.tax_total)}
                    </td>
                    <td className="py-4 px-5 text-right font-bold text-slate-900">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedInvoice(inv)}
                          className="h-7 gap-1 text-[11px]"
                        >
                          <Printer className="h-3 w-3" />
                          <span>View & Print</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal Preview */}
      <InvoiceModal
        invoice={selectedInvoice}
        customer={data.customer}
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
