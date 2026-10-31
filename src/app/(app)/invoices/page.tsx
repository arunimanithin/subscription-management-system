import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getPageAuth } from "@/features/billing/auth";
import { MarkOverdueButton } from "@/features/billing/components/invoice-actions";
import { AuthNotice } from "@/features/billing/components/auth-notice";
import { Input, Select } from "@/features/billing/components/fields";
import { InvoiceTable } from "@/features/billing/components/invoice-table";
import { listInvoices } from "@/features/billing/invoices/service";
import { INVOICE_STATUSES } from "@/types/enums";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const auth = await getPageAuth();
  const header = (
    <PageHeader
      title="Invoices"
      description="Invoices, taxes, discounts and overdue tracking."
      actions={
        <>
          <MarkOverdueButton />
          <Button asChild>
            <Link href="/invoices/new">
              <Plus /> New invoice
            </Link>
          </Button>
        </>
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
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  const date = (v?: string) => (v && isoDate.test(v) ? v : undefined);
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const filters = {
    search: sp.search?.trim().slice(0, 100) || undefined,
    customer_id: sp.customer_id && uuidRe.test(sp.customer_id) ? sp.customer_id : undefined,
    issue_from: date(sp.issue_from),
    issue_to: date(sp.issue_to),
    due_from: date(sp.due_from),
    due_to: date(sp.due_to),
  };
  const active = Object.fromEntries(Object.entries({ ...filters, status }).filter(([, v]) => v)) as Record<string, string>;
  const [{ data, error }, customers] = await Promise.all([
    listInvoices(auth.supabase, { page, page_size: PAGE_SIZE, status, ...filters }),
    auth.supabase.from("customers").select("id, name").order("name").limit(500),
  ]);
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const qs = (p: number) => `/invoices?${new URLSearchParams({ ...active, page: String(p) })}`;
  const chip = (s?: string) => `/invoices?${new URLSearchParams({ ...Object.fromEntries(Object.entries(active).filter(([k]) => k !== "status")), ...(s ? { status: s } : {}) })}`;

  return (
    <>
      {header}
      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        {[undefined, ...INVOICE_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={chip(s)}
            className={cn(
              "rounded-full border px-3 py-1 capitalize text-muted-foreground hover:bg-accent",
              status === s && "border-primary bg-accent text-accent-foreground",
            )}
          >
            {(s ?? "all").replace(/_/g, " ")}
          </Link>
        ))}
      </div>
      <form method="get" className="mb-4 grid gap-3 rounded-lg border bg-card p-3 text-xs md:grid-cols-6">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label className="flex flex-col gap-1 md:col-span-2">
          Search
          <Input name="search" defaultValue={filters.search} placeholder="Invoice number or customer" />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          Customer
          <Select name="customer_id" defaultValue={filters.customer_id ?? ""}>
            <option value="">All customers</option>
            {(customers.data ?? []).map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          Due from
          <Input type="date" name="due_from" defaultValue={filters.due_from} />
        </label>
        <label className="flex flex-col gap-1">
          Due to
          <Input type="date" name="due_to" defaultValue={filters.due_to} />
        </label>
        <label className="flex flex-col gap-1">
          Issued from
          <Input type="date" name="issue_from" defaultValue={filters.issue_from} />
        </label>
        <label className="flex flex-col gap-1">
          Issued to
          <Input type="date" name="issue_to" defaultValue={filters.issue_to} />
        </label>
        <div className="flex items-end gap-2 md:col-span-4 md:justify-end">
          <Button type="submit" size="sm">
            Apply filters
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={status ? `/invoices?status=${status}` : "/invoices"}>Clear</Link>
          </Button>
        </div>
      </form>
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
