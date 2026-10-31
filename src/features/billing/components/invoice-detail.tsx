import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InvoiceDetail as InvoiceDetailData } from "@/types/api";
import { PaymentForm } from "@/features/billing/components/payment-form";
import { RefundButton } from "@/features/billing/components/invoice-actions";
import { formatCurrency, formatDate } from "@/lib/utils";

const PAYABLE = ["open", "partially_paid", "overdue"];

export function InvoiceDetail({ invoice, canManage = false }: { invoice: InvoiceDetailData; canManage?: boolean }) {
  const money = (n: number) => formatCurrency(n, invoice.currency);
  const payable = PAYABLE.includes(invoice.status) && invoice.amount_due > 0;
  const daysOverdue = payable ? daysPast(invoice.due_date) : 0;
  return (
    <div className="flex flex-col gap-6">
      {daysOverdue > 0 ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          This invoice is {daysOverdue} day{daysOverdue === 1 ? "" : "s"} past its due date ({formatDate(invoice.due_date)}). Balance due: {money(invoice.amount_due)}.
        </p>
      ) : null}
      {invoice.status === "void" ? (
        <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">This invoice is void. It cannot be paid or edited.</p>
      ) : null}
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Meta label="Customer">
            <div className="font-medium">{invoice.customer.name}</div>
            {invoice.customer.company ? <div className="text-muted-foreground">{invoice.customer.company}</div> : null}
            {invoice.customer.email ? <div className="text-muted-foreground">{invoice.customer.email}</div> : null}
          </Meta>
          <Meta label="Issued">{formatDate(invoice.issue_date)}</Meta>
          <Meta label="Due">{formatDate(invoice.due_date)}</Meta>
          <Meta label="Status">
            <StatusBadge status={invoice.status} />
          </Meta>
        </CardContent>
      </Card>

      <Card className="overflow-x-auto py-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Unit price</th>
              <th className="px-4 py-3 text-right font-medium">Discount</th>
              <th className="px-4 py-3 text-right font-medium">Tax</th>
              <th className="px-4 py-3 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">{money(item.unit_price)}</td>
                <td className="px-4 py-3 text-right">
                  {item.discount_percent
                    ? `${item.discount_percent}% (${money(item.discount_amount)})`
                    : item.discount_amount > 0
                      ? `${money(item.discount_amount)} (fixed)`
                      : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {item.tax_rate ? `${item.tax_rate}% (${money(item.tax_amount)})` : "—"}
                </td>
                <td className="px-4 py-3 text-right font-medium">{money(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {canManage && payable ? (
        <PaymentForm key={`${invoice.amount_paid}-${invoice.status}`} invoiceId={invoice.id} balanceDue={invoice.amount_due} currency={invoice.currency} />
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {invoice.payments.length === 0 ? (
              <p className="text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <span>
                      {formatDate(p.paid_at)} · {p.method.replace(/_/g, " ")}
                    </span>
                    <span className="flex items-center gap-2">
                      {money(p.amount)} <StatusBadge status={p.status} />
                      {canManage && p.status === "succeeded" ? <RefundButton paymentId={p.id} /> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            <Line label="Subtotal" value={money(invoice.subtotal)} />
            <Line label="Discount" value={`− ${money(invoice.discount_total)}`} />
            <Line label="Tax" value={money(invoice.tax_total)} />
            <div className="border-t pt-2">
              <Line label="Total" value={money(invoice.total)} bold />
            </div>
            <Line label="Paid" value={money(invoice.amount_paid)} />
            <Line label="Balance due" value={money(invoice.amount_due)} bold />
          </CardContent>
        </Card>
      </div>

      {invoice.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** Whole days between the due date and today (UTC); 0 when not yet due. */
function daysPast(due: string): number {
  const ms = Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(due.slice(0, 10));
  return ms > 0 ? Math.round(ms / 86_400_000) : 0;
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
