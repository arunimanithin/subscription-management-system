import type { Invoice, Payment, Subscription } from "@/types";

export interface HealthScoreInput {
  status: Subscription["status"] | "closed";
  expiryDate: string | null;
  invoices: Pick<Invoice, "id" | "status" | "due_date" | "amount_due">[];
  payments: Pick<Payment, "invoice_id" | "status" | "paid_at">[];
  asOfDate?: string;
}

export type HealthScoreCategory = "Healthy" | "Needs Attention" | "At Risk";

export interface HealthScoreResult {
  score: number;
  category: HealthScoreCategory;
  reasons: string[];
}

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function toDateKey(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function isOnTimePayment(
  payment: HealthScoreInput["payments"][number],
  invoicesById: Map<string, HealthScoreInput["invoices"][number]>,
): boolean {
  if (payment.status !== "succeeded") return false;

  const invoice = invoicesById.get(payment.invoice_id);
  const paymentDate = toDateKey(payment.paid_at);
  const dueDate = invoice ? toDateKey(invoice.due_date) : null;

  return paymentDate !== null && dueDate !== null && paymentDate <= dueDate;
}

export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const reasons: string[] = [];
  let score = 100;
  let deductionsApplied = false;
  const today = toDateKey(input.asOfDate ?? new Date().toISOString());

  const overdueInvoices = input.invoices.filter((invoice) => {
    if (invoice.status === "overdue") return true;

    const dueDate = toDateKey(invoice.due_date);
    return (
      (invoice.status === "open" || invoice.status === "partially_paid") &&
      invoice.amount_due > 0 &&
      today !== null &&
      dueDate !== null &&
      dueDate < today
    );
  });

  if (overdueInvoices.length > 0) {
    const deduction = Math.min(overdueInvoices.length * 15, 45);
    score -= deduction;
    deductionsApplied = true;
    reasons.push(`-${deduction}: ${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}`);
  }

  const failedPayments = input.payments.filter((payment) => payment.status === "failed");
  if (failedPayments.length > 0) {
    const deduction = Math.min(failedPayments.length * 10, 30);
    score -= deduction;
    deductionsApplied = true;
    reasons.push(`-${deduction}: ${failedPayments.length} failed payment${failedPayments.length === 1 ? "" : "s"}`);
  }

  const expiryDate = input.expiryDate ? toDateKey(input.expiryDate) : null;
  if (today !== null && expiryDate !== null) {
    const daysUntilExpiry =
      (Date.parse(`${expiryDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      DAY_IN_MILLISECONDS;

    if (daysUntilExpiry >= 0 && daysUntilExpiry <= 7) {
      score -= 15;
      deductionsApplied = true;
      reasons.push("-15: subscription expires within 7 days");
    } else if (daysUntilExpiry >= 8 && daysUntilExpiry <= 30) {
      score -= 5;
      deductionsApplied = true;
      reasons.push("-5: subscription expires within 30 days");
    }
  }

  if (input.status === "paused") {
    score -= 20;
    deductionsApplied = true;
    reasons.push("-20: subscription is paused");
  }

  const invoicesById = new Map(input.invoices.map((invoice) => [invoice.id, invoice]));
  const consecutiveOnTimePayments = [...input.payments]
    .sort((left, right) => Date.parse(right.paid_at) - Date.parse(left.paid_at))
    .reduce((count, payment) => {
      if (count === -1) return count;
      return isOnTimePayment(payment, invoicesById) ? count + 1 : -1;
    }, 0);

  if (consecutiveOnTimePayments >= 3) {
    score += 10;
    reasons.push(`+10: ${consecutiveOnTimePayments} consecutive on-time payments`);
  }

  if (input.status === "closed") {
    score = 0;
    deductionsApplied = true;
    reasons.push("-100: subscription is closed; score set to 0");
  }

  if (!deductionsApplied) reasons.push("No issues found");

  score = Math.max(0, Math.min(100, score));
  const category: HealthScoreCategory =
    score >= 80 ? "Healthy" : score >= 50 ? "Needs Attention" : "At Risk";

  return { score, category, reasons };
}