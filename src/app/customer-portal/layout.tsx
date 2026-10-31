import { requireCustomerSession } from "@/features/customer-portal/services/portal-service";
import { PortalNav } from "@/features/customer-portal/components/portal-nav";

export default async function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { customer } = await requireCustomerSession();

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalNav customer={customer} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
