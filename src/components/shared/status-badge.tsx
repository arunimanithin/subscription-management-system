import { Badge } from "@/components/ui/badge";

type Variant = "success" | "warning" | "danger" | "info" | "muted" | "secondary";

/** One colour map for every status enum, so all modules look consistent. */
const VARIANTS: Record<string, Variant> = {
  // subscription
  draft: "muted",
  trialing: "info",
  active: "success",
  paused: "warning",
  past_due: "danger",
  cancelled: "muted",
  expired: "muted",
  // quotation
  sent: "info",
  accepted: "success",
  rejected: "danger",
  converted: "secondary",
  // invoice
  open: "info",
  partially_paid: "warning",
  paid: "success",
  overdue: "danger",
  void: "muted",
  // payment
  pending: "warning",
  succeeded: "success",
  failed: "danger",
  refunded: "muted",
  // customer
  inactive: "muted",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANTS[status] ?? "muted"}>{status.replace(/_/g, " ")}</Badge>;
}
