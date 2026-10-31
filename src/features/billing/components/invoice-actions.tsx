"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

async function post(url: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return null;
    const json = await res.json().catch(() => null);
    return json?.error?.message ?? `Request failed (HTTP ${res.status})`;
  } catch {
    return "Network error. Please try again.";
  }
}

/** draft -> open. Only shown for draft invoices. */
export function IssueInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function issue() {
    setBusy(true);
    setError(null);
    const err = await post(`/api/invoices/${invoiceId}/transition`, { action: "issue" });
    setBusy(false);
    if (err) setError(err);
    else router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={issue} disabled={busy}>
        {busy ? "Issuing…" : "Issue invoice"}
      </Button>
      {error ? <span className="max-w-xs text-right text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

/** Two-step refund (click, then confirm) so a stray click cannot refund a payment. */
export function RefundButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refund() {
    setBusy(true);
    setError(null);
    const err = await post(`/api/payments/${paymentId}/refund`);
    setBusy(false);
    if (err) setError(err);
    else {
      setConfirming(false);
      router.refresh();
    }
  }

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Refund
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <Button type="button" variant="destructive" size="sm" onClick={refund} disabled={busy}>
        {busy ? "Refunding…" : "Confirm refund"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
        Cancel
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
