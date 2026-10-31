/**
 * SHARED – billing period date math (UTC, 'YYYY-MM-DD' strings).
 * Month-based intervals clamp to the last day of the month
 * (31 Jan + 1 month = 28/29 Feb), so use the ORIGINAL start date and a
 * multiplier when computing many periods ahead if you need exact anchoring.
 */
import type { BillingInterval } from "@/types/enums";

const pad = (n: number) => String(n).padStart(2, "0");

function parse(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = parse(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function addMonths(date: string, months: number): string {
  const [y, m, d] = parse(date);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, last))}`;
}

/** Next period boundary: addInterval('2026-01-31','month') -> '2026-02-28'. */
export function addInterval(date: string, interval: BillingInterval, count = 1): string {
  switch (interval) {
    case "week":
      return addDays(date, 7 * count);
    case "month":
      return addMonths(date, count);
    case "quarter":
      return addMonths(date, 3 * count);
    case "year":
      return addMonths(date, 12 * count);
  }
}
