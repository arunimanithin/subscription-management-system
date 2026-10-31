import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8" aria-label="Loading analytics">
      <header className="space-y-2 border-b border-slate-200 pb-5"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-64" /></header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-md border border-slate-200 bg-white p-4"><Skeleton className="h-4 w-32" /><Skeleton className="mt-4 h-8 w-36" /><Skeleton className="mt-2 h-3 w-28" /></div>)}</section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]"><Skeleton className="h-[340px] rounded-md" /><Skeleton className="h-[340px] rounded-md" /></section>
      <Skeleton className="h-72 rounded-md" />
    </div>
  );
}