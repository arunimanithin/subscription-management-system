import { getDashboardData } from "@/features/intelligence/services/dashboard-service";
import { AnalyticsView } from "@/features/intelligence/analytics/analytics-view";

export const metadata = { title: "Analytics | SubscriptIQ" };

export default async function AnalyticsPage() {
  const data = await getDashboardData();
  return <AnalyticsView data={data} />;
}
