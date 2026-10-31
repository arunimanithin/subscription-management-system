import { getCustomerPortalData } from "@/features/customer-portal/services/portal-service";
import { PortalPaymentsView } from "@/features/customer-portal/components/portal-payments-view";

export const metadata = { title: "Payment History – SubscriptIQ" };

export default async function CustomerPortalPaymentsPage() {
  const data = await getCustomerPortalData();
  return <PortalPaymentsView data={data} />;
}
