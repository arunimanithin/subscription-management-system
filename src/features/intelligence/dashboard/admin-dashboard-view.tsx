"use client";

import { useState } from "react";
import type { DashboardData } from "../services/dashboard-service";
import { DashboardHeader } from "./dashboard-header";
import { StatCardsGrid } from "./stat-cards-grid";
import { RevenueTrendChart } from "./revenue-trend-chart";
import { SubscriptionOverview } from "./subscription-overview";
import { RecentActivity } from "./recent-activity";

interface AdminDashboardViewProps {
  initialData: DashboardData;
}

export function AdminDashboardView({ initialData }: AdminDashboardViewProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/summary");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setData((prev) => ({
            ...prev,
            summary: json.data,
          }));
        }
      }
    } catch {
      // Keep existing data on transient fetch error
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with live badges, role indicator & refresh */}
      <DashboardHeader
        dataSource={data.dataSource}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 2. Top-tier SaaS KPI Cards */}
      <StatCardsGrid summary={data.summary} />

      {/* 3. Middle Section: Revenue Trend Area Chart + Realtime Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueTrendChart data={data.revenueTrend} />
        </div>
        <div className="lg:col-span-1">
          <RecentActivity activities={data.recentActivity} />
        </div>
      </div>

      {/* 4. Bottom Section: Comprehensive Filterable Subscription Overview */}
      <SubscriptionOverview subscriptions={data.subscriptions} />
    </div>
  );
}
