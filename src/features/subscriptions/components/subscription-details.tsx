"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  formatCurrency,
  getSubscriptionById,
  renewSubscription,
  transitionSubscription,
} from "@/features/subscriptions";
import { calcLine } from "@/lib/money";
import type { SubscriptionDetail } from "@/types/api";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(parsed);
}

export function SubscriptionDetails({ id }: { id: string }) {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSubscriptionById(id);
      setSubscription(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to fetch subscription");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runTransition = async (action: "activate" | "pause" | "resume" | "cancel") => {
    if (!subscription) return;
    const confirmed = window.confirm(`Proceed with the '${action}' action for ${subscription.subscription_number}?`);
    if (!confirmed) return;

    try {
      const updated = await transitionSubscription(subscription.id, action);
      setSubscription(updated);
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : "Unable to update subscription status");
    }
  };

  const runRenewal = async () => {
    if (!subscription) return;
    const confirmed = window.confirm(`Advance ${subscription.subscription_number} by one billing cycle?`);
    if (!confirmed) return;

    try {
      const updated = await renewSubscription(subscription.id);
      setSubscription(updated);
      setError(null);
    } catch (renewalError) {
      setError(renewalError instanceof Error ? renewalError.message : "Unable to renew subscription");
    }
  };

  if (loading) {
    return <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading subscription...</CardContent></Card>;
  }

  if (error || !subscription) {
    return <Card><CardContent className="py-8 text-sm text-red-600">{error ?? "Subscription not found"}</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">{subscription.subscription_number}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">Customer: {subscription.customer.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={subscription.status} />
            <Button variant="outline" onClick={() => router.push("/subscriptions")}>Back</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Plan</p>
            <p className="mt-2 font-medium">{subscription.items[0]?.description ?? "Custom"}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Billing frequency</p>
            <p className="mt-2 font-medium">{subscription.billing_interval}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Next billing</p>
            <p className="mt-2 font-medium">{formatDate(subscription.next_billing_date)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void runTransition("activate")} disabled={subscription.status !== "draft"}>Activate</Button>
            <Button variant="outline" onClick={() => void runTransition("pause")} disabled={subscription.status !== "active" && subscription.status !== "trialing"}>Pause</Button>
            <Button variant="outline" onClick={() => void runTransition("resume")} disabled={subscription.status !== "paused"}>Resume</Button>
            <Button variant="secondary" onClick={() => void runRenewal()} disabled={!["active", "trialing", "past_due"].includes(subscription.status)}>
              Renew
            </Button>
            <Button variant="destructive" onClick={() => void runTransition("cancel")} disabled={!["draft", "trialing", "active", "paused", "past_due"].includes(subscription.status)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><p className="text-xs uppercase text-muted-foreground">Customer email</p><p className="mt-2">{subscription.customer.email ?? "—"}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Start date</p><p className="mt-2">{formatDate(subscription.start_date)}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Expiry</p><p className="mt-2">{formatDate(subscription.current_period_end)}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Trial end</p><p className="mt-2">{formatDate(subscription.trial_end_date)}</p></div>
          <div className="md:col-span-2"><p className="text-xs uppercase text-muted-foreground">Notes</p><p className="mt-2 whitespace-pre-wrap">{subscription.notes ?? "No notes added."}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Discount</th>
                <th className="px-3 py-2">Tax</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {subscription.items.map((item) => {
                const lineTotal = calcLine({
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  discount_percent: item.discount_percent ?? 0,
                  tax_rate: item.tax_rate ?? 0,
                }).line_total;

                return (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{formatCurrency(item.unit_price, subscription.currency)}</td>
                    <td className="px-3 py-2">{item.discount_percent ?? 0}%</td>
                    <td className="px-3 py-2">{item.tax_rate ?? 0}%</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(lineTotal, subscription.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
