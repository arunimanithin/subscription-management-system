"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  formatCurrency,
  getSubscriptionPlanLabel,
  getSubscriptionTotal,
  listSubscriptions,
  SUBSCRIPTION_STATUS_OPTIONS,
} from "@/features/subscriptions";
import type { SubscriptionDetail } from "@/types/api";

function formatDate(date: string | null): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(parsed);
}

export default function SubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof SUBSCRIPTION_STATUS_OPTIONS)[number]>("all");
  const [rows, setRows] = useState<SubscriptionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await listSubscriptions({ page, page_size: pageSize, search: search.trim(), status });
        if (!active) return;
        setRows(result.data);
        setTotal(result.meta.total);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load subscriptions");
        setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = window.setTimeout(load, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, search, status]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Manage recurring subscriptions, status changes, and lifecycle tasks."
        actions={
          <Button asChild>
            <Link href="/subscriptions/new">Create subscription</Link>
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
              placeholder="Search by subscription number or customer"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-ring"
            />
          </div>

          <div>
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as (typeof SUBSCRIPTION_STATUS_OPTIONS)[number]);
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-ring md:w-52"
            >
              {SUBSCRIPTION_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All statuses" : option.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Loading subscriptions…</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-sm text-red-600">{error}</CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No subscriptions match the current filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Subscription</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Start</th>
                  <th className="px-4 py-3 font-medium">Expiry</th>
                  <th className="px-4 py-3 font-medium">Next billing</th>
                  <th className="px-4 py-3 font-medium">Frequency</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((subscription) => (
                  <tr key={subscription.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{subscription.subscription_number}</td>
                    <td className="px-4 py-3">{subscription.customer.name}</td>
                    <td className="px-4 py-3">{getSubscriptionPlanLabel(subscription)}</td>
                    <td className="px-4 py-3">{formatDate(subscription.start_date)}</td>
                    <td className="px-4 py-3">{formatDate(subscription.current_period_end ?? subscription.current_period_start)}</td>
                    <td className="px-4 py-3">{formatDate(subscription.next_billing_date)}</td>
                    <td className="px-4 py-3">{subscription.billing_interval}</td>
                    <td className="px-4 py-3">{formatCurrency(getSubscriptionTotal(subscription), subscription.currency)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={subscription.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/subscriptions/${subscription.id}`}>View</Link>
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
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
