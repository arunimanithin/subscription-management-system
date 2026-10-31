"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RevenueTrendPoint } from "../services/mock-data";
import { formatCurrency } from "@/lib/format";

interface RevenueTrendChartProps {
  data: RevenueTrendPoint[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Revenue Velocity & Collections</h2>
          <p className="text-xs text-muted-foreground">
            Monthly invoiced billing vs. collected cashflow over the past 6 billing cycles
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-[#635BFF]" />
            Invoiced Total
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-[#00D4B2]" />
            Collected
          </span>
        </div>
      </div>

      <div className="h-[280px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="invoicedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#635BFF" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#635BFF" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="collectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D4B2" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00D4B2" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="month"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-white p-3 shadow-lg text-xs">
                      <p className="font-semibold text-slate-900 mb-1.5">{label}</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4 text-[#635BFF]">
                          <span>Invoiced:</span>
                          <span className="font-semibold">{formatCurrency(Number(payload[0]?.value) || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-[#00A88F]">
                          <span>Collected:</span>
                          <span className="font-semibold">{formatCurrency(Number(payload[1]?.value) || 0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="invoiced"
              stroke="#635BFF"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#invoicedGradient)"
              name="Invoiced"
            />
            <Area
              type="monotone"
              dataKey="collected"
              stroke="#00D4B2"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#collectedGradient)"
              name="Collected"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
