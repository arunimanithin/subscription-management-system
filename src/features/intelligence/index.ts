/**
 * PUBLIC API of the intelligence module. Other modules may import ONLY from this file
 * (never from deep paths). Export services/components here when they are stable.
 */
export { intelligenceNav } from "./nav";
export { AdminDashboardView } from "./dashboard/admin-dashboard-view";
export { getDashboardData } from "./services/dashboard-service";
export { LeakRadarView } from "./radar/leak-radar-view";
export { getLeakRadarData } from "./services/leak-radar-service";
export { calculateHealthScore } from "./services/healthScore";
