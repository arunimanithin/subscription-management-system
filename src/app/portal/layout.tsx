import Link from "next/link";
import { Repeat2 } from "lucide-react";

// Customer portal shell (Member 4). Customers never see the staff sidebar.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 font-semibold">
          <Repeat2 className="size-5 text-primary" />
          <Link href="/portal">SubscriptIQ Portal</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 md:p-8">{children}</main>
    </div>
  );
}
