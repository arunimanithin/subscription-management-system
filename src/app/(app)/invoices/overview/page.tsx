import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { getPageAuth } from "@/features/billing/auth";
import { AuthNotice } from "@/features/billing/components/auth-notice";
import { FinancialOverview } from "@/features/billing/components/financial-overview";
import { getAgingReport, getFinancialSummary } from "@/features/billing/reports/service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "3", label: "Last 3 months", months: 3 },
  { key: "6", label: "Last 6 months", months: 6 },
  { key: "12", label: "Last 12 months", months: 12 },
  { key: "all", label: "All time", months: null },
] as const;

export default async function BillingOverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const range = RANGES.find((r) => r.key === sp.range) ?? RANGES[2];
  const header = <PageHeader title="Financial overview" description="Billed, collected, outstanding and overdue money, from your invoices and payments." />;
  const auth = await getPageAuth();
  if (auth.status !== "ok") {
    return (
      <>
        {header}
        <AuthNotice status={auth.status} />
      </>
    );
  }
  if (auth.profile.role === "customer") {
    return (
      <>
        {header}
        <p className="rounded-md border p-4 text-sm text-muted-foreground">The financial overview is available to admin and staff users.</p>
      </>
    );
  }

  const now = new Date();
  const from = range.months ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (range.months - 1), 1)).toISOString().slice(0, 10) : undefined;
  const [summary, aging] = await Promise.all([getFinancialSummary(auth.supabase, { from }), getAgingReport(auth.supabase)]);
  const error = summary.error ?? aging.error;

  return (
    <>
      {header}
      <div className="mb-5 flex flex-wrap gap-1.5 text-sm">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/invoices/overview?range=${r.key}`}
            className={cn("rounded-full border px-3 py-1 text-muted-foreground hover:bg-accent", range.key === r.key && "border-primary bg-accent text-accent-foreground")}
          >
            {r.label}
          </Link>
        ))}
      </div>
      {error || !summary.data || !aging.data ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Could not load the overview: {error?.message ?? "unknown error"}. If this mentions a missing function, run the latest billing migration (20261031150001) in Supabase.
        </p>
      ) : (
        <FinancialOverview summary={summary.data} aging={aging.data} />
      )}
    </>
  );
}
