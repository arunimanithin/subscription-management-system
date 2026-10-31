"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/features/billing/components/fields";
import { addDays, todayISO } from "@/lib/billing-period";
import { calcLine, calcTotals } from "@/lib/money";
import { formatCurrency } from "@/lib/utils";
import { createInvoiceSchema } from "@/types/schemas";
import type { CreateInvoiceRequest, InvoiceResponse } from "@/types/api";
import type { CreateInvoiceInput } from "@/features/billing/invoices/types";

export interface CustomerOption {
  id: string;
  name: string;
  company: string | null;
}
export interface PlanOption {
  id: string;
  name: string;
  price: number;
  tax_rate: number;
  product_id: string;
  product_name: string;
}

const emptyLine = { plan_id: null, product_id: null, description: "", quantity: 1, unit_price: 0, discount_percent: 0, tax_rate: 0 };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function InvoiceForm({ customers, plans }: { customers: CustomerOption[]; plans: PlanOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvoiceRequest, unknown, CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      customer_id: "",
      currency: "INR",
      issue_date: todayISO(),
      due_date: addDays(todayISO(), 14),
      notes: "",
      items: [{ ...emptyLine }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watched = useWatch({ control, name: "items" });

  const lines = (watched ?? []).map((l) => ({
    quantity: num(l?.quantity),
    unit_price: num(l?.unit_price),
    discount_percent: num(l?.discount_percent),
    tax_rate: num(l?.tax_rate),
  }));
  const totals = calcTotals(lines);

  function applyPlan(index: number, planId: string) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      setValue(`items.${index}.plan_id`, null);
      setValue(`items.${index}.product_id`, null);
      return;
    }
    // Snapshot: values are copied into the line now and stored on the invoice as-is.
    setValue(`items.${index}.plan_id`, plan.id);
    setValue(`items.${index}.product_id`, plan.product_id);
    setValue(`items.${index}.description`, `${plan.product_name} – ${plan.name}`);
    setValue(`items.${index}.unit_price`, plan.price);
    setValue(`items.${index}.tax_rate`, plan.tax_rate);
  }

  async function onSubmit(values: CreateInvoiceInput) {
    setServerError(null);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setServerError(json?.error?.message ?? `Request failed (HTTP ${res.status})`);
      return;
    }
    router.push(`/invoices/${(json as InvoiceResponse).data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Customer" error={errors.customer_id?.message} className="md:col-span-3">
            <Select {...register("customer_id")}>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` – ${c.company}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Issue date" error={errors.issue_date?.message}>
            <Input type="date" {...register("issue_date")} />
          </Field>
          <Field label="Due date" error={errors.due_date?.message}>
            <Input type="date" {...register("due_date")} />
          </Field>
          <Field label="Notes" className="md:col-span-3">
            <Textarea {...register("notes")} placeholder="Optional note shown on the invoice" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {fields.map((field, index) => {
            const line = calcLine(lines[index] ?? { quantity: 0, unit_price: 0 });
            const lineErrors = errors.items?.[index];
            return (
              <div key={field.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-12">
                <Field label="Plan (optional)" className="md:col-span-4">
                  <Select defaultValue="" onChange={(e) => applyPlan(index, e.target.value)}>
                    <option value="">Custom item</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name} – {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Description" error={lineErrors?.description?.message} className="md:col-span-8">
                  <Input {...register(`items.${index}.description`)} />
                </Field>
                <Field label="Qty" error={lineErrors?.quantity?.message} className="md:col-span-2">
                  <Input type="number" step="0.01" min="0" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                </Field>
                <Field label="Unit price" error={lineErrors?.unit_price?.message} className="md:col-span-3">
                  <Input type="number" step="0.01" min="0" {...register(`items.${index}.unit_price`, { valueAsNumber: true })} />
                </Field>
                <Field label="Discount %" error={lineErrors?.discount_percent?.message} className="md:col-span-2">
                  <Input type="number" step="0.01" min="0" max="100" {...register(`items.${index}.discount_percent`, { valueAsNumber: true })} />
                </Field>
                <Field label="Tax %" error={lineErrors?.tax_rate?.message} className="md:col-span-2">
                  <Input type="number" step="0.01" min="0" max="100" {...register(`items.${index}.tax_rate`, { valueAsNumber: true })} />
                </Field>
                <div className="flex items-end justify-between gap-2 md:col-span-3">
                  <div className="text-sm">
                    <div className="text-xs text-muted-foreground">Line total</div>
                    <div className="font-medium">{formatCurrency(line.line_total)}</div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} aria-label="Remove line">
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}
          {errors.items?.message ? <p className="text-xs text-destructive">{errors.items.message}</p> : null}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyLine })}>
              <Plus /> Add line
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
          <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <Row label="Discount" value={`− ${formatCurrency(totals.discount_total)}`} />
          <Row label="Tax" value={formatCurrency(totals.tax_total)} />
          <div className="mt-1 border-t pt-2">
            <Row label="Total" value={formatCurrency(totals.total)} bold />
          </div>
          <p className="text-xs text-muted-foreground">Preview only – the server recalculates the final amounts.</p>
        </CardContent>
      </Card>

      {serverError ? <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{serverError}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/invoices")}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create draft invoice"}
        </Button>
      </div>
    </form>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
