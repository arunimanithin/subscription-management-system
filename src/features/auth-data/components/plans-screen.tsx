"use client";

import { ActiveBadge, ResourceManager, type ColumnDef, type FieldDef } from "./resource-manager";

const fields: FieldDef[] = [
  { key: "product_id", label: "Product", type: "select", required: true, optionsFrom: { endpoint: "/api/products", labelKey: "name" } },
  { key: "name", label: "Plan name", type: "text", required: true },
  { key: "price", label: "Price", type: "number", required: true, step: "0.01", min: 0 },
  { key: "currency", label: "Currency (3 letters)", type: "text", required: true, default: "INR" },
  {
    key: "billing_interval",
    label: "Billed every",
    type: "select",
    required: true,
    default: "month",
    options: [
      { value: "week", label: "week" },
      { value: "month", label: "month" },
      { value: "quarter", label: "quarter" },
      { value: "year", label: "year" },
    ],
  },
  { key: "interval_count", label: "Interval count", type: "number", required: true, default: 1, min: 1, max: 36 },
  { key: "trial_days", label: "Trial days", type: "number", required: true, default: 0, min: 0, max: 365 },
  { key: "setup_fee", label: "Setup fee", type: "number", required: true, default: 0, step: "0.01", min: 0 },
  { key: "tax_rate", label: "Tax rate (%)", type: "number", required: true, default: 0, step: "0.01", min: 0, max: 100 },
  { key: "is_active", label: "Active", type: "checkbox", default: true },
  { key: "description", label: "Description", type: "textarea" },
];

const money = (r: Record<string, unknown>) =>
  `${String(r.currency)} ${Number(r.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const columns: ColumnDef[] = [
  { header: "Plan", render: (r) => <span className="font-medium">{String(r.name)}</span> },
  { header: "Product", render: (r) => String((r.product as { name?: string } | null)?.name ?? "—") },
  { header: "Price", render: (r) => money(r) },
  {
    header: "Billing",
    render: (r) => `every ${Number(r.interval_count) > 1 ? `${r.interval_count} ` : ""}${r.billing_interval}${Number(r.interval_count) > 1 ? "s" : ""}`,
  },
  { header: "Tax", render: (r) => `${r.tax_rate}%` },
  { header: "Status", render: (r) => <ActiveBadge active={Boolean(r.is_active)} /> },
];

export function PlansScreen() {
  return (
    <ResourceManager
      endpoint="/api/plans"
      singular="plan"
      fields={fields}
      columns={columns}
      searchPlaceholder="Search plans"
      statusOptions={[
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ]}
    />
  );
}
