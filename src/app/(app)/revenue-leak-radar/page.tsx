import { getLeakRadarData } from "@/features/intelligence/services/leak-radar-service";
import { LeakRadarView } from "@/features/intelligence/radar/leak-radar-view";

export const metadata = {
  title: "Revenue Leak Radar | SubscriptIQ",
  description: "Detect failed payments, overdue invoices, missed renewals, and revenue anomalies.",
};

export default async function RevenueLeakRadarPage() {
  const summary = await getLeakRadarData();
  return <LeakRadarView initialSummary={summary} />;
}
