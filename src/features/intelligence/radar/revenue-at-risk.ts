type RevenueRiskAlert = {
  severity: "high" | "medium" | "low";
  entityType: "invoice" | "subscription" | "payment";
  entityId: string;
  revenueAtRisk: number;
  status: "open" | "resolved";
};

export function calculateDeduplicatedRevenueAtRisk(alerts: RevenueRiskAlert[]): number {
  const severityRank: Record<RevenueRiskAlert["severity"], number> = {
    high: 3,
    medium: 2,
    low: 1,
  };
  const entityMap = new Map<string, { severity: number; amount: number }>();

  for (const alert of alerts) {
    if (alert.status !== "open") continue;

    const key = `${alert.entityType}:${alert.entityId}`;
    const currentRank = severityRank[alert.severity];
    const existing = entityMap.get(key);

    if (!existing || currentRank > existing.severity) {
      entityMap.set(key, { severity: currentRank, amount: alert.revenueAtRisk });
    } else if (currentRank === existing.severity) {
      entityMap.set(key, {
        severity: currentRank,
        amount: Math.max(existing.amount, alert.revenueAtRisk),
      });
    }
  }

  let total = 0;
  for (const entity of entityMap.values()) total += entity.amount;

  return Math.round(total);
}