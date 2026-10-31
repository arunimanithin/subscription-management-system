import { getDashboardData } from "@/features/intelligence/services/dashboard-service";
import { AdminDashboardView } from "@/features/intelligence/dashboard/admin-dashboard-view";

export const metadata = {
  title: "Admin Dashboard | SubscriptIQ",
  description: "Real-time subscription intelligence, metrics and activity overview.",
};

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <AdminDashboardView initialData={data} />;
}
