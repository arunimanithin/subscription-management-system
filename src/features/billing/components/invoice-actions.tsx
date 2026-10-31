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

/** Void a draft / open / overdue invoice that has no payments. Two steps + optional reason. */
export function VoidInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmVoid() {
    setBusy(true);
    setError(null);
    const err = await post(`/api/invoices/${invoiceId}/transition`, { action: "void", reason: reason.trim() || undefined });
    setBusy(false);
    if (err) setError(err);
    else {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Void invoice
      </Button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-2 rounded-md border p-3">
      <input
        className="w-64 rounded-md border bg-card px-3 py-1.5 text-sm"
        placeholder="Reason (optional)"
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex gap-2">
        <Button variant="destructive" size="sm" onClick={confirmVoid} disabled={busy}>
          {busy ? "Voiding…" : "Confirm void"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
      {error ? <span className="max-w-xs text-right text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

/** Admin/staff: flag open / partially paid invoices past their due date as overdue. */
export function MarkOverdueButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/invoices/mark-overdue", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) setMsg(json?.error?.message ?? `Request failed (HTTP ${res.status})`);
      else {
        const n = json?.data?.updated ?? 0;
        setMsg(n === 0 ? "No invoices needed updating." : `${n} invoice${n === 1 ? "" : "s"} marked overdue.`);
        router.refresh();
      }
    } catch {
      setMsg("Network error. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-2">
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      <Button variant="outline" size="sm" onClick={run} disabled={busy}>
        {busy ? "Checking…" : "Update overdue"}
      </Button>
    </div>
  );
}
