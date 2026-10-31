import { getCustomerPortalData } from "@/features/customer-portal/services/portal-service";
import { PortalSubscriptionsView } from "@/features/customer-portal/components/portal-subscriptions-view";

export const metadata = { title: "My Subscriptions – SubscriptIQ" };

export default async function CustomerPortalSubscriptionsPage() {
  const data = await getCustomerPortalData();
  return <PortalSubscriptionsView data={data} />;
}
