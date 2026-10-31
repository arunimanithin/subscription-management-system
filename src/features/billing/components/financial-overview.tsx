import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgingReport, CurrencyAging, CurrencySummary, FinancialSummary } from "@/features/billing/reports/types";
import { cn, formatCurrency } from "@/lib/utils";
import { INVOICE_STATUSES } from "@/types/enums";

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const monthLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
const BUCKET_LABEL: Record<string, string> = { current: "Not yet due", "1-30": "1–30 days", "31-60": "31–60 days", "61-90": "61–90 days", "90+": "90+ days" };

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "danger" }) {
  return (
    <Card className="gap-1 px-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-semibold tabular-nums", tone === "danger" && "text-destructive")}>{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  const w = max > 0 ? Math.max(value > 0 ? 2 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div className={cn("h-2 rounded-full bg-primary", className)} style={{ width: `${w}%` }} />
    </div>
  );
}

function CurrencySection({ s, aging }: { s: CurrencySummary; aging?: CurrencyAging }) {
  const money = (v: number) => formatCurrency(v, s.currency);
  const maxMonth = Math.max(0, ...s.monthly.flatMap((m) => [m.billed, m.collected]));
  const maxBucket = Math.max(0, ...(aging?.buckets.map((b) => b.amount) ?? [0]));
  const maxMethod = Math.max(0, ...s.payments_by_method.map((m) => m.amount));

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Billed" value={money(s.billed)} hint={`Collection rate ${pct(s.collection_rate)}`} />
        <Kpi label="Collected" value={money(s.collected)} hint={s.refunded > 0 ? `${money(s.refunded)} refunded` : "Payments received in period"} />
        <Kpi label="Outstanding" value={money(s.outstanding)} hint={`${s.open_invoice_count} unpaid invoice${s.open_invoice_count === 1 ? "" : "s"} (as of today)`} />
        <Kpi
          label="Overdue"
          value={money(s.overdue_amount)}
          hint={`${s.overdue_count} invoice${s.overdue_count === 1 ? "" : "s"} past due`}
          tone={s.overdue_amount > 0 ? "danger" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billed vs collected by month</CardTitle>
            <CardDescription>Billed = invoices issued that month. Collected = payments received that month.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing billed or collected in this period.</p>
            ) : (
              s.monthly.map((m) => (
                <div key={m.month} className="grid grid-cols-[4rem_1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
                  <span className="row-span-2 text-muted-foreground">{monthLabel(m.month)}</span>
                  <Bar value={m.billed} max={maxMonth} />
                  <span className="text-right tabular-nums">{money(m.billed)}</span>
                  <Bar value={m.collected} max={maxMonth} className="bg-emerald-600" />
                  <span className="text-right tabular-nums text-muted-foreground">{money(m.collected)}</span>
                </div>
              ))
            )}
            <div className="flex gap-4 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><i className="inline-block size-2 rounded-full bg-primary" /> Billed</span>
              <span className="flex items-center gap-1.5"><i className="inline-block size-2 rounded-full bg-emerald-600" /> Collected</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receivables aging</CardTitle>
            <CardDescription>Unpaid balance by how long it is past its due date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!aging || aging.total_outstanding === 0 ? (
              <p className="text-sm text-muted-foreground">No unpaid invoices.</p>
            ) : (
              aging.buckets.map((b) => (
                <div key={b.bucket} className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{BUCKET_LABEL[b.bucket]}</span>
                  <Bar value={b.amount} max={maxBucket} className={b.bucket === "current" ? "bg-primary" : "bg-destructive"} />
                  <span className="text-right tabular-nums">
                    {money(b.amount)} <span className="text-xs text-muted-foreground">({b.count})</span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Invoices by status</CardTitle>
            <CardDescription>Issued in this period.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {INVOICE_STATUSES.map((st) => (
                <li key={st} className="flex items-center justify-between py-2">
                  <Link href={`/invoices?status=${st}`} className="hover:underline">
                    <StatusBadge status={st} />
                  </Link>
                  <span className="tabular-nums">
                    {s.invoices_by_status[st].count} · {money(s.invoices_by_status[st].total)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments by method</CardTitle>
            <CardDescription>Succeeded payments in this period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.payments_by_method.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments in this period.</p>
            ) : (
              s.payments_by_method.map((m) => (
                <div key={m.method} className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="capitalize">{String(m.method).replace(/_/g, " ")}</span>
                    <span className="tabular-nums">
                      {money(m.amount)} <span className="text-xs text-muted-foreground">({m.count})</span>
                    </span>
                  </div>
                  <Bar value={m.amount} max={maxMethod} />
                </div>
              ))
            )}
            {s.failed_payments > 0 ? <p className="pt-1 text-xs text-muted-foreground">{s.failed_payments} failed payment attempt{s.failed_payments === 1 ? "" : "s"} not counted.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top overdue customers</CardTitle>
            <CardDescription>Largest past-due balances.</CardDescription>
          </CardHeader>
          <CardContent>
            {!aging || aging.top_overdue_customers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nobody is overdue.</p>
            ) : (
              <ul className="divide-y text-sm">
                {aging.top_overdue_customers.map((c) => (
                  <li key={c.customer_id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <Link href={`/invoices?customer_id=${c.customer_id}&status=overdue`} className="block truncate font-medium text-primary hover:underline">
                        {c.customer_name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {c.invoices} invoice{c.invoices === 1 ? "" : "s"} · oldest {c.oldest_days_overdue}d overdue
                      </span>
                    </div>
                    <span className="tabular-nums text-destructive">{money(c.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function FinancialOverview({ summary, aging }: { summary: FinancialSummary; aging: AgingReport }) {
  if (summary.currencies.length === 0) {
    return <Card className="items-center py-12 text-sm text-muted-foreground">No invoices yet, so there is nothing to report.</Card>;
  }
  const many = summary.currencies.length > 1;
  return (
    <div className="space-y-10">
      {summary.currencies.map((s) => (
        <div key={s.currency} className="space-y-3">
          {many ? <h2 className="text-lg font-semibold">{s.currency}</h2> : null}
          <CurrencySection s={s} aging={aging.currencies.find((a) => a.currency === s.currency)} />
        </div>
      ))}
      {many ? <p className="text-xs text-muted-foreground">Currencies are reported separately and never added together.</p> : null}
    </div>
  );
}
