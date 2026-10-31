import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { getPageAuth } from "@/features/billing/auth";
import { AuthNotice } from "@/features/billing/components/auth-notice";
import { PaymentsTable } from "@/features/billing/components/payments-table";
import { listPayments } from "@/features/billing/payments/service";
import { cn } from "@/lib/utils";
import { PAYMENT_STATUSES } from "@/types/enums";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const auth = await getPageAuth();
  const header = <PageHeader title="Payments" description="Payment history across all invoices. Record payments from an invoice page." />;
  if (auth.status !== "ok") {
    return (
      <>
        {header}
        <AuthNotice status={auth.status} />
      </>
    );
  }

  const status = (PAYMENT_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { data, error } = await listPayments(auth.supabase, { page, page_size: PAGE_SIZE, status });
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const qs = (p: number) => `/payments?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`;

  return (
    <>
      {header}
      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        {[undefined, ...PAYMENT_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/payments?status=${s}` : "/payments"}
            className={cn(
              "rounded-full border px-3 py-1 capitalize text-muted-foreground hover:bg-accent",
              status === s && "border-primary bg-accent text-accent-foreground",
            )}
          >
            {s ?? "all"}
          </Link>
        ))}
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">Could not load payments: {error.message}</p>
      ) : (
        <>
          <PaymentsTable rows={data.rows} />
          {pages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {pages} · {data.total} payments
              </span>
              <span className="flex gap-2">
                {page > 1 ? <Link className="text-primary hover:underline" href={qs(page - 1)}>Previous</Link> : null}
                {page < pages ? <Link className="text-primary hover:underline" href={qs(page + 1)}>Next</Link> : null}
              </span>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
