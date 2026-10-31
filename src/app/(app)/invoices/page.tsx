import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getPageAuth } from "@/features/billing/auth";
import { AuthNotice } from "@/features/billing/components/auth-notice";
import { InvoiceTable } from "@/features/billing/components/invoice-table";
import { listInvoices } from "@/features/billing/invoices/service";
import { INVOICE_STATUSES } from "@/types/enums";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const auth = await getPageAuth();
  const header = (
    <PageHeader
      title="Invoices"
      description="Invoices, taxes, discounts and overdue tracking."
      actions={
        <Button asChild>
          <Link href="/invoices/new">
            <Plus /> New invoice
          </Link>
        </Button>
      }
    />
  );
  if (auth.status !== "ok") {
    return (
      <>
        {header}
        <AuthNotice status={auth.status} />
      </>
    );
  }

  const status = (INVOICE_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { data, error } = await listInvoices(auth.supabase, { page, page_size: PAGE_SIZE, status });
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const qs = (p: number) => `/invoices?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`;

  return (
    <>
      {header}
      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        {[undefined, ...INVOICE_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/invoices?status=${s}` : "/invoices"}
            className={cn(
              "rounded-full border px-3 py-1 capitalize text-muted-foreground hover:bg-accent",
              status === s && "border-primary bg-accent text-accent-foreground",
            )}
          >
            {(s ?? "all").replace(/_/g, " ")}
          </Link>
        ))}
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Could not load invoices: {error.message}
        </p>
      ) : (
        <>
          <InvoiceTable rows={data.rows} />
          {pages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {pages} · {data.total} invoices
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
