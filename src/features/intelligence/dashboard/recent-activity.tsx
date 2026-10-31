import {
  CreditCard,
  UserPlus,
  AlertTriangle,
  RefreshCw,
  FileCheck2,
  XCircle,
  Activity,
} from "lucide-react";
import type { RecentActivityItem } from "../services/mock-data";

interface RecentActivityProps {
  activities: RecentActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getIcon = (type: RecentActivityItem["type"]) => {
    switch (type) {
      case "payment_success":
        return <CreditCard className="h-4 w-4 text-emerald-600" />;
      case "subscription_created":
        return <UserPlus className="h-4 w-4 text-blue-600" />;
      case "invoice_overdue":
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      case "subscription_renewed":
        return <RefreshCw className="h-4 w-4 text-indigo-600" />;
      case "quotation_converted":
        return <FileCheck2 className="h-4 w-4 text-amber-600" />;
      case "payment_failed":
        return <XCircle className="h-4 w-4 text-rose-600" />;
      default:
        return <Activity className="h-4 w-4 text-slate-600" />;
    }
  };

  const getIconBg = (type: RecentActivityItem["type"]) => {
    switch (type) {
      case "payment_success":
        return "bg-emerald-50 border-emerald-200";
      case "subscription_created":
        return "bg-blue-50 border-blue-200";
      case "invoice_overdue":
      case "payment_failed":
        return "bg-rose-50 border-rose-200";
      case "subscription_renewed":
        return "bg-indigo-50 border-indigo-200";
      case "quotation_converted":
        return "bg-amber-50 border-amber-200";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-slate-900">Live Activity Stream</h2>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Realtime
        </span>
      </div>

      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto pt-1">
        {activities.map((item) => (
          <div key={item.id} className="py-3 flex items-start gap-3 transition-colors hover:bg-slate-50/60 rounded-lg px-2">
            <div className={`mt-0.5 rounded-lg border p-2 shrink-0 ${getIconBg(item.type)}`}>
              {getIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-900 truncate">{item.title}</p>
                <span className="text-[11px] text-slate-400 shrink-0">{item.timestamp}</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{item.description}</p>
              {item.amount && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">{item.amount}</span>
                  <span className="text-[10px] rounded bg-slate-100 px-1.5 py-0.2 text-slate-600 font-medium">
                    {item.badge}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
