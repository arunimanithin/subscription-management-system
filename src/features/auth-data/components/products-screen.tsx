"use client";

import { ActiveBadge, ResourceManager, type ColumnDef, type FieldDef } from "./resource-manager";

const fields: FieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "sku", label: "SKU", type: "text" },
  { key: "category", label: "Category", type: "text" },
  { key: "is_active", label: "Active", type: "checkbox", default: true },
  { key: "description", label: "Description", type: "textarea" },
];

const columns: ColumnDef[] = [
  { header: "Name", render: (r) => <span className="font-medium">{String(r.name)}</span> },
  { header: "SKU", render: (r) => String(r.sku ?? "—") },
  { header: "Category", render: (r) => String(r.category ?? "—") },
  { header: "Status", render: (r) => <ActiveBadge active={Boolean(r.is_active)} /> },
];

export function ProductsScreen() {
  return (
    <ResourceManager
      endpoint="/api/products"
      singular="product"
      fields={fields}
      columns={columns}
      searchPlaceholder="Search name, SKU or category"
      statusOptions={[
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ]}
    />
  );
}
