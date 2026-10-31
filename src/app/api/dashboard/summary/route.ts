import { ok } from "@/lib/api/respond";
import { getDashboardData } from "@/features/intelligence/services/dashboard-service";

/**
 * GET /api/dashboard/summary
 * Contract: CONTRACTS.md section 4 (DashboardSummaryResponse)
 * Accessible by: admin, staff
 */
export async function GET() {
  const data = await getDashboardData();
  return ok(data.summary);
}
