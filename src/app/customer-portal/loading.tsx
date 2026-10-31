import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerPortalLoading() {
  return (
    <div className="space-y-6" aria-label="Loading customer portal">
      <section className="rounded-lg bg-[#0A2540] p-6 sm:p-8">
        <Skeleton className="h-5 w-36 bg-white/20" />
        <Skeleton className="mt-4 h-8 w-64 max-w-full bg-white/20" />
        <Skeleton className="mt-2 h-4 w-48 max-w-full bg-white/20" />
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-8 w-28" />
            <Skeleton className="mt-3 h-3 w-36" />
          </div>
        ))}
      </section>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-48" />
        </div>
        <div className="space-y-4 p-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}