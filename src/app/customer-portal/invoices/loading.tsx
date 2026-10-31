import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerPortalInvoicesLoading() {
  return (
    <div className="space-y-6" aria-label="Loading invoices">
      <header className="space-y-2 border-b border-slate-200 pb-4">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="space-y-5 p-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              {Array.from({ length: 8 }, (_, cellIndex) => (
                <Skeleton key={cellIndex} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}