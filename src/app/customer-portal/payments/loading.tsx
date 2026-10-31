import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerPortalPaymentsLoading() {
  return (
    <div className="space-y-6" aria-label="Loading payment history">
      <header className="space-y-2 border-b border-slate-200 pb-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>
      <section className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-36" />
          </div>
        ))}
      </section>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="space-y-5 p-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }, (_, cellIndex) => (
                <Skeleton key={cellIndex} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}