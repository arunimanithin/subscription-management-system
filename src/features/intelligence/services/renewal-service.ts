import { getDashboardData } from "./dashboard-service";
import type { DashboardSubscriptionItem, RecentActivityItem } from "./mock-data";

export type RenewalStatus = "upcoming" | "expired" | "renewed";

export interface RenewalItem {
  id: string;
  customer: string;
  plan: string;
  expiryDate: string;
  renewalStatus: RenewalStatus;
  daysLeft: number;
}

export interface RenewalData {
  dueIn7Days: RenewalItem[];
  dueIn15Days: RenewalItem[];
  dueIn30Days: RenewalItem[];
  expired: RenewalItem[];
  renewed: RenewalItem[];
}

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function dateKey(value: string): string | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function hasRenewalActivity(
  subscription: DashboardSubscriptionItem,
  activities: RecentActivityItem[],
): boolean {
  const customerNames = [subscription.customer_name, subscription.company]
    .filter((name): name is string => Boolean(name))
    .map((name) => name.toLocaleLowerCase());
  const planName = subscription.plan_name.toLocaleLowerCase();

  return activities.some((activity) => {
    if (activity.type !== "subscription_renewed") return false;

    const description = activity.description.toLocaleLowerCase();
    return (
      description.includes(planName) &&
      customerNames.some((customerName) => description.includes(customerName))
    );
  });
}

export async function getRenewalData(): Promise<RenewalData> {
  const dashboardData = await getDashboardData();
  const today = dateKey(new Date().toISOString());
  const groups: RenewalData = {
    dueIn7Days: [],
    dueIn15Days: [],
    dueIn30Days: [],
    expired: [],
    renewed: [],
  };

  if (!today) return groups;

  const todayTimestamp = Date.parse(`${today}T00:00:00Z`);

  for (const subscription of dashboardData.subscriptions) {
    const expiryDate = dateKey(subscription.next_billing_date);
    if (!expiryDate) continue;

    const daysLeft = Math.floor(
      (Date.parse(`${expiryDate}T00:00:00Z`) - todayTimestamp) / DAY_IN_MILLISECONDS,
    );
    const item: RenewalItem = {
      id: subscription.id,
      customer: subscription.customer_name,
      plan: subscription.plan_name,
      expiryDate,
      renewalStatus: "upcoming",
      daysLeft,
    };

    if (daysLeft < 0) {
      groups.expired.push({ ...item, renewalStatus: "expired" });
    } else if (hasRenewalActivity(subscription, dashboardData.recentActivity)) {
      groups.renewed.push({ ...item, renewalStatus: "renewed" });
    } else if (daysLeft <= 7) {
      groups.dueIn7Days.push(item);
    } else if (daysLeft <= 15) {
      groups.dueIn15Days.push(item);
    } else if (daysLeft <= 30) {
      groups.dueIn30Days.push(item);
    }
  }

  return groups;
}