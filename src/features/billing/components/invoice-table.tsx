import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import type { InvoiceListRow } from "@/features/billing/invoices/service";
import { formatCurrency, formatDate } from "@/lib/utils";

export function InvoiceTable({ rows }: { rows: InvoiceListRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="items-center py-12 text-sm text-muted-foreground">
        No invoices found. Create one with the &ldquo;New invoice&rdquo; button.
      </Card>
    );
  }
  return (
    <Card className="overflow-x-auto py-0">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Invoice</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Issued</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 text-right font-medium">Balance</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((inv) => (
            <tr key={inv.id} className="border-b last:border-0 hover:bg-accent/40">
              <td className="px-4 py-3 font-medium">
                <Link className="text-primary hover:underline" href={`/invoices/${inv.id}`}>
                  {inv.invoice_number}
                </Link>
              </td>
              <td className="px-4 py-3">{inv.customer?.name ?? "—"}</td>
              <td className="px-4 py-3">{formatDate(inv.issue_date)}</td>
              <td className="px-4 py-3">
                {formatDate(inv.due_date)}
                {pastDueDays(inv) > 0 ? <div className="text-xs text-destructive">{pastDueDays(inv)}d overdue</div> : null}
              </td>
              <td className="px-4 py-3 text-right">{formatCurrency(inv.total, inv.currency)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(inv.amount_due, inv.currency)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={inv.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/** Days past the due date for invoices that still owe money (UTC); 0 otherwise. */
function pastDueDays(inv: InvoiceListRow): number {
  if (!["open", "partially_paid", "overdue"].includes(inv.status) || inv.amount_due <= 0) return 0;
  const ms = Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(inv.due_date.slice(0, 10));
  return ms > 0 ? Math.round(ms / 86_400_000) : 0;
}
