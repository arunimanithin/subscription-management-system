import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value?: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "danger" | "warning";
  loading?: boolean;
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default", loading }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-slate-400" aria-hidden />}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p
          className={cn(
            "mt-2 text-2xl font-semibold tracking-tight tabular-nums",
            tone === "danger" && "text-red-600",
            tone === "warning" && "text-amber-600",
            tone === "default" && "text-[#0A2540]"
          )}
        >
          {value ?? "—"}
        </p>
      )}
      {hint && !loading && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}