import { getCustomerPortalData } from "@/features/customer-portal/services/portal-service";
import { PortalOverviewView } from "@/features/customer-portal/components/portal-overview-view";

export const metadata = { title: "My Portal – SubscriptIQ" };

export default async function CustomerPortalPage() {
  const data = await getCustomerPortalData();
  return <PortalOverviewView data={data} />;
}
