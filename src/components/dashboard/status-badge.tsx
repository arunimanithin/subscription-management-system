import { cn } from "@/lib/utils";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONES: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  info: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

// Subscription: Draft, Quotation, Confirmed, Active, Closed. Invoice: Draft, Confirmed, Paid.
const STATUS_TONE: Record<string, Tone> = {
  active: "success", paid: "success", healthy: "success", renewed: "success",
  confirmed: "info", quotation: "info", sent: "info",
  draft: "neutral", closed: "neutral", cancelled: "neutral",
  overdue: "danger", failed: "danger", expired: "danger", "at risk": "danger",
  "needs attention": "warning", pending: "warning", outstanding: "warning",
};

export function StatusBadge({ status, tone }: { status: string; tone?: Tone }) {
  const t = tone ?? STATUS_TONE[status.toLowerCase()] ?? "neutral";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[t])}>
      {status}
    </span>
  );
}