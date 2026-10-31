import { getCustomerPortalData } from "@/features/customer-portal/services/portal-service";
import { PortalInvoicesView } from "@/features/customer-portal/components/portal-invoices-view";

export const metadata = { title: "My Invoices – SubscriptIQ" };

export default async function CustomerPortalInvoicesPage() {
  const data = await getCustomerPortalData();
  return <PortalInvoicesView data={data} />;
}
