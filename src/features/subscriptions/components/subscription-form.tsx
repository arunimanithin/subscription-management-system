"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSubscription, formatCurrency } from "@/features/subscriptions";
import { calcTotals } from "@/lib/money";
import { cn } from "@/lib/utils";
import { createSubscriptionSchema } from "@/types/schemas";
import type { CreateSubscriptionRequest } from "@/types/api";

export interface CustomerOption {
  id: string;
  name: string;
  email?: string | null;
}

export interface ProductOption {
  id: string;
  name: string;
  description?: string | null;
  price?: number;
  sku?: string | null;
}

export interface PlanOption {
  id: string;
  name: string;
  price: number;
  currency?: string;
  product_id: string;
  product_name?: string;
  description?: string | null;
}

export function SubscriptionForm({
  customers,
  products,
  plans = [],
}: {
  customers: CustomerOption[];
  products: ProductOption[];
  plans?: PlanOption[];
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultPlan = plans[0] ?? null;
  const defaultProduct = products.find((product) => product.id === defaultPlan?.product_id) ?? products[0] ?? null;

  const form = useForm<CreateSubscriptionRequest>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: {
      customer_id: customers[0]?.id ?? "",
      currency: "INR",
      billing_interval: "month",
      interval_count: 1,
      start_date: new Date().toISOString().slice(0, 10),
      trial_days: 0,
      notes: "",
      items: [
        {
          description: defaultPlan?.name ?? defaultProduct?.name ?? "Subscription item",
          quantity: 1,
          unit_price: defaultPlan?.price ?? defaultProduct?.price ?? 0,
          discount_percent: 0,
          tax_rate: 0,
          product_id: defaultPlan?.product_id ?? defaultProduct?.id ?? undefined,
          plan_id: defaultPlan?.id ?? undefined,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items") ?? [];
  const findProductById = (productId?: string) => products.find((product) => product.id === productId);
  const findPlanById = (planId?: string) => plans.find((plan) => plan.id === planId);

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
      const created = await createSubscription(values);
      router.push(`/subscriptions/${created.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create subscription");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <select
                {...form.register("customer_id")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {customers.length === 0 ? <option value="">No customers available yet</option> : null}
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.email ? `(${customer.email})` : ""}
                  </option>
                ))}
              </select>
              {form.formState.errors.customer_id ? (
                <p className="text-xs text-red-600">{form.formState.errors.customer_id.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Billing frequency</label>
              <select
                {...form.register("billing_interval")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {(["week", "month", "quarter", "year"] as const).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start date</label>
              <input type="date" {...form.register("start_date")} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Interval count</label>
              <input
                type="number"
                min={1}
                {...form.register("interval_count", { valueAsNumber: true })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Trial days</label>
              <input
                type="number"
                min={0}
                {...form.register("trial_days", { valueAsNumber: true })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <input readOnly value={form.watch("currency")} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Products</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    description: products[0]?.name ?? "New subscription item",
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
            </div>

            {fields.map((field, index) => {
              const selectedItem = items[index] ?? {};
              const productMatch = products.find((product) => product.id === selectedItem.product_id);

              return (
                <div key={field.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-7">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Product</label>
                    <select
                      value={selectedItem.product_id ?? ""}
                      onChange={(event) => {
                        const product = findProductById(event.target.value || undefined);
                        const plan = plans.find((entry) => entry.product_id === product?.id);
                        form.setValue(`items.${index}.product_id`, product?.id ?? undefined, { shouldValidate: true });
                        form.setValue(`items.${index}.plan_id`, plan?.id ?? undefined, { shouldValidate: true });
                        form.setValue(`items.${index}.description`, plan?.name ?? product?.name ?? selectedItem.description ?? "Subscription item", { shouldValidate: true });
                        form.setValue(`items.${index}.unit_price`, plan?.price ?? product?.price ?? selectedItem.unit_price ?? 0, { shouldValidate: true });
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
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</label>
                    <select
                      value={selectedItem.plan_id ?? ""}
                      onChange={(event) => {
                        const plan = findPlanById(event.target.value || undefined);
                        const product = findProductById((plan?.product_id ?? selectedItem.product_id) ?? undefined);
                        form.setValue(`items.${index}.plan_id`, plan?.id ?? undefined, { shouldValidate: true });
                        form.setValue(`items.${index}.product_id`, plan?.product_id ?? product?.id ?? selectedItem.product_id ?? undefined, { shouldValidate: true });
                        form.setValue(`items.${index}.description`, plan?.name ?? product?.name ?? selectedItem.description ?? "Subscription item", { shouldValidate: true });
                        form.setValue(`items.${index}.unit_price`, plan?.price ?? product?.price ?? selectedItem.unit_price ?? 0, { shouldValidate: true });
                      }}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select plan</option>
                      {plans.filter((plan) => !selectedItem.product_id || plan.product_id === selectedItem.product_id).map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</label>
                    <input
                      value={selectedItem.description ?? ""}
                      onChange={(event) => form.setValue(`items.${index}.description`, event.target.value, { shouldValidate: true })}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={selectedItem.quantity ?? 1}
                      onChange={(event) => form.setValue(`items.${index}.quantity`, Number(event.target.value), { shouldValidate: true })}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit price</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={selectedItem.unit_price ?? 0}
                      onChange={(event) => form.setValue(`items.${index}.unit_price`, Number(event.target.value), { shouldValidate: true })}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Discount %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={selectedItem.discount_percent ?? 0}
                      onChange={(event) => form.setValue(`items.${index}.discount_percent`, Number(event.target.value), { shouldValidate: true })}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tax %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={selectedItem.tax_rate ?? 0}
                      onChange={(event) => form.setValue(`items.${index}.tax_rate`, Number(event.target.value), { shouldValidate: true })}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="md:col-span-6 flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => remove(index)} disabled={fields.length === 1}>
                      Remove
                    </Button>
                  </div>

                  {productMatch ? (
                    <div className="md:col-span-6 text-xs text-muted-foreground">
                      Selected product: {productMatch.name} • {productMatch.sku ?? "no SKU"}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              {...form.register("notes")}
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Add internal notes or onboarding information"
            />
          </div>

          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Subtotal</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(totals.subtotal, form.watch("currency"))}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Discount</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(totals.discount_total, form.watch("currency"))}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Tax</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(totals.tax_total, form.watch("currency"))}</p>
            </div>
            <div className={cn("rounded-md border p-3", "border-primary/40 bg-primary/5") }>
              <p className="text-xs uppercase text-muted-foreground">Total</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(totals.total, form.watch("currency"))}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/subscriptions")}>
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating..." : "Create subscription"}
        </Button>
      </div>
    </form>
  );
}
