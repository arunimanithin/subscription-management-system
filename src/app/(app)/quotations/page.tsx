"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, listQuotations, QUOTATION_STATUS_OPTIONS } from "@/features/quotations";
import type { QuotationDetail } from "@/types/api";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

export default function QuotationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof QUOTATION_STATUS_OPTIONS)[number]>("all");
  const [rows, setRows] = useState<QuotationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listQuotations({ page, page_size: pageSize, search: search.trim(), status });
        if (!active) return;
        setRows(result.data);
        setTotal(result.meta.total);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load quotations");
        setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, search, status]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Create and manage quoting workflows, approvals, and conversion to subscriptions."
        actions={
          <Button asChild>
            <Link href="/quotations/new">Create quotation</Link>
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search by quotation number or customer"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as (typeof QUOTATION_STATUS_OPTIONS)[number]);
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-52"
            >
              {QUOTATION_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All statuses" : option.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading quotations…</CardContent></Card>
      ) : error ? (
        <Card><CardContent className="py-8 text-sm text-red-600">{error}</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No quotations match the current filters.</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Quotation</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Valid until</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((quotation) => (
                  <tr key={quotation.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{quotation.quotation_number}</td>
                    <td className="px-4 py-3">{quotation.customer.name}</td>
                    <td className="px-4 py-3">{formatDate(quotation.created_at)}</td>
                    <td className="px-4 py-3">{formatDate(quotation.valid_until)}</td>
                    <td className="px-4 py-3">{formatCurrency(quotation.total, quotation.currency)}</td>
                    <td className="px-4 py-3"><StatusBadge status={quotation.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/quotations/${quotation.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">{total} total</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
              <span className="text-sm text-muted-foreground">{page} / {pageCount}</span>
              <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
