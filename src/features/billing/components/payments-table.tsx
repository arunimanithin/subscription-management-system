import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import type { PaymentListRow } from "@/features/billing/payments/service";
import { formatCurrency, formatDate } from "@/lib/utils";

export function PaymentsTable({ rows }: { rows: PaymentListRow[] }) {
  if (rows.length === 0) {
    return <Card className="items-center py-12 text-sm text-muted-foreground">No payments recorded yet.</Card>;
  }
  return (
    <Card className="overflow-x-auto py-0">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Invoice</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Method</th>
            <th className="px-4 py-3 font-medium">Reference</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b last:border-0 hover:bg-accent/40">
              <td className="px-4 py-3">{formatDate(p.paid_at)}</td>
              <td className="px-4 py-3 font-medium">
                <Link className="text-primary hover:underline" href={`/invoices/${p.invoice_id}`}>
                  {p.invoice_number}
                </Link>
              </td>
              <td className="px-4 py-3">{p.customer_name ?? "—"}</td>
              <td className="px-4 py-3 capitalize">{p.method.replace(/_/g, " ")}</td>
              <td className="px-4 py-3 text-muted-foreground">{p.reference ?? "—"}</td>
              <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.amount, p.currency)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
