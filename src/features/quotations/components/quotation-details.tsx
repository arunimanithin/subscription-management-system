"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { convertQuotation, formatCurrency, getQuotationById, transitionQuotation } from "@/features/quotations";
import type { QuotationDetail } from "@/types/api";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

export function QuotationDetails({ id }: { id: string }) {
  const router = useRouter();
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuotation(await getQuotationById(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load quotation");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTransition = async (action: "send" | "accept" | "reject") => {
    if (!quotation) return;
    const confirmed = window.confirm(`Process '${action}' action for ${quotation.quotation_number}?`);
    if (!confirmed) return;
    try {
      const updated = await transitionQuotation(quotation.id, action);
      setQuotation(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update quotation");
    }
  };

  const handleConvert = async () => {
    if (!quotation) return;
    const confirmed = window.confirm(`Convert ${quotation.quotation_number} into a subscription?`);
    if (!confirmed) return;
    try {
      const result = await convertQuotation(quotation.id, {
        start_date: new Date().toISOString().slice(0, 10),
        billing_interval: "month",
        interval_count: 1,
      });
      router.push(`/subscriptions/${result.subscription.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to convert quotation");
    }
  };

  if (loading) return <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading quotation…</CardContent></Card>;
  if (error || !quotation) return <Card><CardContent className="py-8 text-sm text-red-600">{error ?? "Quotation not found"}</CardContent></Card>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">{quotation.quotation_number}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">Customer: {quotation.customer.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={quotation.status} />
            <Button variant="outline" onClick={() => router.push("/quotations")}>Back</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border p-3"><p className="text-xs uppercase text-muted-foreground">Created</p><p className="mt-2 font-medium">{formatDate(quotation.created_at)}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs uppercase text-muted-foreground">Valid until</p><p className="mt-2 font-medium">{formatDate(quotation.valid_until)}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs uppercase text-muted-foreground">Total</p><p className="mt-2 font-medium">{formatCurrency(quotation.total, quotation.currency)}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => void handleTransition("send")} disabled={quotation.status !== "draft"}>Send</Button>
          <Button variant="outline" onClick={() => void handleTransition("accept")} disabled={quotation.status !== "sent"}>Accept</Button>
          <Button variant="outline" onClick={() => void handleTransition("reject")} disabled={quotation.status !== "sent"}>Reject</Button>
          <Button variant="secondary" onClick={() => void handleConvert()} disabled={quotation.status !== "accepted"}>Convert to subscription</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><p className="text-xs uppercase text-muted-foreground">Customer email</p><p className="mt-2">{quotation.customer.email ?? "—"}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Currency</p><p className="mt-2">{quotation.currency}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Subtotal</p><p className="mt-2">{formatCurrency(quotation.subtotal, quotation.currency)}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Discount</p><p className="mt-2">{formatCurrency(quotation.discount_total, quotation.currency)}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Tax</p><p className="mt-2">{formatCurrency(quotation.tax_total, quotation.currency)}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Total</p><p className="mt-2">{formatCurrency(quotation.total, quotation.currency)}</p></div>
          <div className="md:col-span-2"><p className="text-xs uppercase text-muted-foreground">Notes</p><p className="mt-2 whitespace-pre-wrap">{quotation.notes ?? "No notes added."}</p></div>
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
                <th className="px-3 py-2 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{item.description}</td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2">{formatCurrency(item.unit_price, quotation.currency)}</td>
                  <td className="px-3 py-2">{item.discount_percent ?? 0}%</td>
                  <td className="px-3 py-2">{item.tax_rate ?? 0}%</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.line_total, quotation.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
