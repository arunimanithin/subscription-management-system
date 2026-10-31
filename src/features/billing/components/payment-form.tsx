"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/features/billing/components/fields";
import { round2 } from "@/lib/money";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/types/enums";
import { createPaymentSchema } from "@/types/schemas";

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Records a payment against an open / partially paid / overdue invoice.
 * - The amount cannot exceed the balance due (the database enforces this too).
 * - One idempotency key per mounted form: a double click or a retry after a network error
 *   returns the original payment instead of charging twice. The parent remounts this form
 *   (via `key`) after a successful payment, which creates a fresh key.
 */
export function PaymentForm({ invoiceId, balanceDue, currency }: { invoiceId: string; balanceDue: number; currency: string }) {
  const router = useRouter();
  const balance = round2(balanceDue);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [idempotencyKey] = useState(newKey);

  const schema = useMemo(
    () =>
      createPaymentSchema.extend({
        amount: z
          .number({ invalid_type_error: "Enter a valid amount" })
          .positive("Amount must be greater than 0")
          .max(balance, `Cannot exceed the balance due of ${formatCurrency(balance, currency)}`),
      }),
    [balance, currency],
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { invoice_id: invoiceId, amount: balance, method: "upi", reference: "", notes: "", idempotency_key: idempotencyKey },
  });

  async function onSubmit(values: z.output<typeof schema>) {
    setServerError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, amount: round2(values.amount) }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setServerError(json?.error?.message ?? `Request failed (HTTP ${res.status})`);
        return;
      }
      if (res.status === 200) setNotice("This payment was already recorded; nothing was charged twice.");
      router.refresh();
    } catch {
      // Network failure: the same idempotency key makes a retry safe.
      setServerError("Network error. It is safe to press the button again; a duplicate payment will not be created.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record payment</CardTitle>
        <CardDescription>
          Balance due: <span className="font-medium text-foreground">{formatCurrency(balance, currency)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
          <Field label="Amount" error={errors.amount?.message}>
            <div className="flex gap-2">
              <Input type="number" step="0.01" min="0" {...register("amount", { valueAsNumber: true })} />
              <Button type="button" variant="outline" size="sm" className="shrink-0 self-center" onClick={() => setValue("amount", balance, { shouldValidate: true })}>
                Pay full
              </Button>
            </div>
          </Field>
          <Field label="Method" error={errors.method?.message}>
            <Select {...register("method")}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference (optional)">
            <Input placeholder="Transaction / cheque number" {...register("reference")} />
          </Field>
          <Field label="Notes (optional)">
            <Input {...register("notes")} />
          </Field>
          <div className="flex flex-col gap-2 md:col-span-2">
            {serverError ? <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{serverError}</p> : null}
            {notice ? <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{notice}</p> : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Recording…" : "Record payment"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
