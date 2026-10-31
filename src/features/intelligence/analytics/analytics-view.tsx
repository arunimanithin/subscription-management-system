import { Activity, CircleDollarSign, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { RevenueTrendChart } from "@/features/intelligence/dashboard/revenue-trend-chart";
import type { DashboardData } from "@/features/intelligence/services/dashboard-service";
import { formatCurrency } from "@/lib/format";

export function AnalyticsView({ data }: { data: DashboardData }) {
  const { summary, revenueTrend } = data;
  const invoiced = revenueTrend.reduce((sum, point) => sum + point.invoiced, 0);
  const collected = revenueTrend.reduce((sum, point) => sum + point.collected, 0);
  const collectionRate = invoiced > 0 ? (collected / invoiced) * 100 : 0;
  const metrics: { label: string; value: string; detail: string; icon: LucideIcon; tone: string }[] = [
    { label: "Monthly recurring revenue", value: formatCurrency(summary.mrr), detail: `${summary.active_subscriptions} active subscriptions`, icon: CircleDollarSign, tone: "text-indigo-700 bg-indigo-50" },
    { label: "Annual recurring revenue", value: formatCurrency(summary.arr), detail: "Current run rate, annualized", icon: TrendingUp, tone: "text-sky-700 bg-sky-50" },
    { label: "Collected this month", value: formatCurrency(summary.revenue_this_month), detail: `Previous month ${formatCurrency(summary.revenue_last_month)}`, icon: Activity, tone: "text-teal-700 bg-teal-50" },
    { label: "Outstanding balance", value: formatCurrency(summary.outstanding_amount), detail: `${summary.overdue_invoice_count} overdue invoices`, icon: Wallet, tone: "text-amber-700 bg-amber-50" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase text-indigo-700">Intelligence</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Revenue performance and collection health.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
          {data.dataSource === "live" ? "Live data" : "Sample data"}
        </span>
      </header>

      <section aria-label="Key revenue metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">{label}</p>
              <span className={`grid size-8 shrink-0 place-items-center rounded-md ${tone}`}><Icon aria-hidden className="size-4" /></span>
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
        {revenueTrend.length ? (
          <RevenueTrendChart data={revenueTrend} />
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-md border border-slate-200 bg-white p-6 text-center">
            <div><Activity aria-hidden className="mx-auto size-8 text-slate-300" /><h2 className="mt-3 text-sm font-semibold text-slate-800">No revenue history yet</h2><p className="mt-1 text-xs text-slate-500">Monthly performance will appear when billing data is available.</p></div>
          </div>
        )}
        <aside className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">Collection performance</h2>
          <p className="mt-1 text-xs text-slate-500">Across the displayed billing periods</p>
          <p className="mt-5 text-4xl font-semibold tabular-nums text-indigo-800">{collectionRate.toFixed(1)}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${collectionRate.toFixed(1)} percent collected`}>
            <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(collectionRate, 100)}%` }} />
          </div>
          <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Invoiced</dt><dd className="font-medium tabular-nums text-slate-900">{formatCurrency(invoiced)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Collected</dt><dd className="font-medium tabular-nums text-slate-900">{formatCurrency(collected)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Not yet collected</dt><dd className="font-medium tabular-nums text-slate-900">{formatCurrency(Math.max(invoiced - collected, 0))}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-base font-semibold text-slate-900">Monthly revenue</h2><p className="mt-0.5 text-xs text-slate-500">Invoiced and collected totals by billing period</p></div>
        {!revenueTrend.length ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No monthly revenue to display.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500"><th scope="col" className="px-5 py-3">Period</th><th scope="col" className="px-5 py-3 text-right">Invoiced</th><th scope="col" className="px-5 py-3 text-right">Collected</th><th scope="col" className="px-5 py-3 text-right">Collection rate</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {[...revenueTrend].reverse().map((point) => {
                  const rate = point.invoiced > 0 ? (point.collected / point.invoiced) * 100 : 0;
                  return <tr key={point.month} className="hover:bg-slate-50/70"><th scope="row" className="px-5 py-3.5 font-medium text-slate-800">{point.month}</th><td className="px-5 py-3.5 text-right tabular-nums text-slate-600">{formatCurrency(point.invoiced)}</td><td className="px-5 py-3.5 text-right font-medium tabular-nums text-slate-900">{formatCurrency(point.collected)}</td><td className="px-5 py-3.5 text-right tabular-nums text-slate-600">{rate.toFixed(1)}%</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}