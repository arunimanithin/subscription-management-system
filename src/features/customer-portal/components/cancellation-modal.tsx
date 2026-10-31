"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CancellationModalProps {
  subscriptionNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
}

export function CancellationModal({
  subscriptionNumber,
  isOpen,
  onClose,
  onSubmit,
}: CancellationModalProps) {
  const [reason, setReason] = useState("Price too high");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      onSubmit(reason, details);
      setSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-50 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-base font-bold text-slate-900">Request Cancellation</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <p className="text-slate-600">
            You are requesting cancellation for subscription <strong className="text-slate-900">{subscriptionNumber}</strong>. Your subscription will remain fully active until the end of the current billing cycle.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Primary reason for cancellation:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
            >
              <option value="Price too high">Price too high / Budget constraints</option>
              <option value="Missing features">Missing essential product features</option>
              <option value="Technical issues">Technical difficulty / Performance</option>
              <option value="Switching to competitor">Switching to alternative solution</option>
              <option value="Project concluded">Project concluded / No longer needed</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Additional feedback (Optional):
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us what we could have done better..."
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-3 text-[11px] text-amber-900">
            <strong>Note:</strong> A support team member will review your request within 24 hours. No immediate penalty fees apply.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Keep Subscription
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Cancellation Request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
