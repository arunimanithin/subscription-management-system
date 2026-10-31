"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createQuotation, formatCurrency } from "@/features/quotations";
import { calcTotals } from "@/lib/money";
import { createQuotationSchema } from "@/types/schemas";
import type { CreateQuotationRequest } from "@/types/api";

export interface CustomerOption {
  id: string;
  name: string;
  email?: string | null;
}

export interface ProductOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
}

export function QuotationForm({ customers, products }: { customers: CustomerOption[]; products: ProductOption[] }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CreateQuotationRequest>({
    resolver: zodResolver(createQuotationSchema),
    defaultValues: {
      customer_id: customers[0]?.id ?? "",
      currency: "INR",
      valid_until: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
      notes: "",
      terms: "",
      items: [
        {
          description: products[0]?.name ?? "Quotation item",
          quantity: 1,
          unit_price: products[0]?.price ?? 0,
          discount_percent: 0,
          tax_rate: 0,
          product_id: products[0]?.id ?? undefined,
          plan_id: undefined,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items") ?? [];
  const totals = calcTotals(
    items.map((item) => ({
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
      discount_percent: Number(item.discount_percent || 0),
      tax_rate: Number(item.tax_rate || 0),
    })),
  );

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const created = await createQuotation(values);
      router.push(`/quotations/${created.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create quotation");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quotation details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer</label>
            <select {...form.register("customer_id")} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              {customers.length === 0 ? <option value="">No customers available yet</option> : null}
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.email ? `(${customer.email})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Valid until</label>
            <input type="date" {...form.register("valid_until")} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea {...form.register("notes")} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Terms</label>
            <textarea {...form.register("terms")} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Line items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                description: products[0]?.name ?? "New line item",
                quantity: 1,
                unit_price: products[0]?.price ?? 0,
                discount_percent: 0,
                tax_rate: 0,
                product_id: products[0]?.id ?? undefined,
                plan_id: undefined,
              })
            }
          >
            Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => {
            const selected = items[index] ?? {};
            return (
              <div key={field.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Product</label>
                  <select
                    value={selected.product_id ?? ""}
                    onChange={(event) => {
                      const product = products.find((entry) => entry.id === event.target.value);
                      form.setValue(`items.${index}.product_id`, product?.id ?? undefined, { shouldValidate: true });
                      form.setValue(`items.${index}.description`, product?.name ?? selected.description ?? "Quotation item", { shouldValidate: true });
                      form.setValue(`items.${index}.unit_price`, product?.price ?? selected.unit_price ?? 0, { shouldValidate: true });
                    }}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Description</label>
                  <input
                    value={selected.description ?? ""}
                    onChange={(event) => form.setValue(`items.${index}.description`, event.target.value, { shouldValidate: true })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={selected.quantity ?? 1}
                    onChange={(event) => form.setValue(`items.${index}.quantity`, Number(event.target.value), { shouldValidate: true })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Unit price</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={selected.unit_price ?? 0}
                    onChange={(event) => form.setValue(`items.${index}.unit_price`, Number(event.target.value), { shouldValidate: true })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Discount %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={selected.discount_percent ?? 0}
                    onChange={(event) => form.setValue(`items.${index}.discount_percent`, Number(event.target.value), { shouldValidate: true })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Tax %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={selected.tax_rate ?? 0}
                    onChange={(event) => form.setValue(`items.${index}.tax_rate`, Number(event.target.value), { shouldValidate: true })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="md:col-span-6 flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => remove(index)} disabled={fields.length === 1}>
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing preview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-md border p-3"><p className="text-xs uppercase text-muted-foreground">Subtotal</p><p className="mt-2 text-lg font-semibold">{formatCurrency(totals.subtotal, form.watch("currency"))}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs uppercase text-muted-foreground">Discount</p><p className="mt-2 text-lg font-semibold">{formatCurrency(totals.discount_total, form.watch("currency"))}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs uppercase text-muted-foreground">Tax</p><p className="mt-2 text-lg font-semibold">{formatCurrency(totals.tax_total, form.watch("currency"))}</p></div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3"><p className="text-xs uppercase text-muted-foreground">Total</p><p className="mt-2 text-lg font-semibold">{formatCurrency(totals.total, form.watch("currency"))}</p></div>
        </CardContent>
      </Card>

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/quotations")}>Cancel</Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Creating..." : "Create quotation"}</Button>
      </div>
    </form>
  );
}
