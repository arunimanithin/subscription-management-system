import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleCheck,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getRenewalData } from "@/features/intelligence";
import type { RenewalData, RenewalItem } from "@/features/intelligence/services/renewal-service";

const renewalGroups = [
  {
    key: "dueIn7Days",
    label: "Due in 7 days",
    icon: CalendarClock,
    accent: "border-l-amber-500",
    valueColor: "text-amber-700",
  },
  {
    key: "dueIn15Days",
    label: "Due in 15 days",
    icon: CalendarDays,
    accent: "border-l-sky-600",
    valueColor: "text-sky-700",
  },
  {
    key: "dueIn30Days",
    label: "Due in 30 days",
    icon: CalendarDays,
    accent: "border-l-teal-600",
    valueColor: "text-teal-700",
  },
  {
    key: "expired",
    label: "Expired",
    icon: AlertCircle,
    accent: "border-l-rose-600",
    valueColor: "text-rose-700",
  },
  {
    key: "renewed",
    label: "Renewed",
    icon: CircleCheck,
    accent: "border-l-emerald-600",
    valueColor: "text-emerald-700",
  },
] as const;

function formatExpiryDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function getStatusStyles(status: RenewalItem["renewalStatus"]): string {
  if (status === "expired") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "renewed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function getAllItems(data: RenewalData): RenewalItem[] {
  return [
    ...data.dueIn7Days,
    ...data.dueIn15Days,
    ...data.dueIn30Days,
    ...data.expired,
    ...data.renewed,
  ].sort((left, right) => left.expiryDate.localeCompare(right.expiryDate));
}

function RenewalSummary({ data }: { data: RenewalData }) {
  return (
    <section aria-label="Renewal counts" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {renewalGroups.map(({ key, label, icon: Icon, accent, valueColor }) => (
        <div key={key} className={`min-h-28 rounded-md border border-slate-200 border-l-4 bg-white p-4 ${accent}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <Icon aria-hidden className="size-4 shrink-0 text-slate-400" />
          </div>
          <p className={`mt-3 text-3xl font-semibold tabular-nums ${valueColor}`}>
            {data[key].length}
          </p>
        </div>
      ))}
    </section>
  );
}

function RenewalTable({ items }: { items: RenewalItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 aria-hidden className="size-5" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">No renewals to track</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          There are no upcoming, expired, or recently renewed subscriptions in the current data.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <th scope="col" className="px-5 py-3">Customer</th>
            <th scope="col" className="px-5 py-3">Plan</th>
            <th scope="col" className="px-5 py-3">Expiry date</th>
            <th scope="col" className="px-5 py-3">Days left</th>
            <th scope="col" className="px-5 py-3">Renewal status</th>
            <th scope="col" className="px-5 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {items.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
              <td className="px-5 py-4 font-medium text-slate-900">{item.customer}</td>
              <td className="px-5 py-4 text-slate-600">{item.plan}</td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatExpiryDate(item.expiryDate)}</td>
              <td className="whitespace-nowrap px-5 py-4 tabular-nums text-slate-600">
                {item.daysLeft < 0 ? `${Math.abs(item.daysLeft)} overdue` : `${item.daysLeft} days`}
              </td>
              <td className="px-5 py-4">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${getStatusStyles(item.renewalStatus)}`}>
                  {item.renewalStatus}
                </span>
              </td>
              <td className="px-5 py-4 text-right">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  title="Connects to subscription renewal service"
                  aria-label={`Renew ${item.customer}: Connects to subscription renewal service`}
                >
                  <RotateCw aria-hidden />
                  Renew
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function RenewalCenterView() {
  const data = await getRenewalData();
  const items = getAllItems(data);

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-1 border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase text-teal-700">Subscriptions</p>
        <h1 className="text-2xl font-semibold text-slate-950">Renewal Center</h1>
        <p className="text-sm text-slate-500">Review upcoming renewals and recently expired subscriptions.</p>
      </header>

      <RenewalSummary data={data} />

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Subscriptions</h2>
            <p className="mt-0.5 text-sm text-slate-500">{items.length} renewal record{items.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <RenewalTable items={items} />
      </section>
    </main>
  );
}

export function RenewalCenterSkeleton() {
  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8" aria-label="Loading Renewal Center">
      <header className="space-y-2 border-b border-slate-200 pb-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </header>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" aria-hidden>
        {renewalGroups.map(({ key }) => (
          <div key={key} className="min-h-28 rounded-md border border-slate-200 bg-white p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-8 w-12" />
          </div>
        ))}
      </section>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-hidden>
        <div className="border-b border-slate-200 p-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-24" />
        </div>
        <div className="space-y-5 p-5">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="grid grid-cols-4 gap-4 sm:grid-cols-6">
              {Array.from({ length: 6 }, (_, cellIndex) => (
                <Skeleton key={cellIndex} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}