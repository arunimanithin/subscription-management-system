import { Repeat, TrendingUp, Wallet, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";

// Hour 1 placeholder: values arrive in Hour 2 from the real data layer.
export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" description="Subscriptions, revenue and payments at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active subscriptions" icon={Repeat} loading />
        <StatCard label="MRR" icon={TrendingUp} loading />
        <StatCard label="Outstanding payments" icon={Wallet} loading />
        <StatCard label="Overdue invoices" icon={AlertTriangle} tone="danger" loading />
      </div>
      <div className="mt-6">
        <EmptyState title="Charts arrive next" description="Revenue trend and status charts connect to live data in the next push." />
      </div>
    </>
  );
}