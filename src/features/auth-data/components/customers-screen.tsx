"use client";

import { ActiveBadge, ResourceManager, type ColumnDef, type FieldDef } from "./resource-manager";

const fields: FieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "company", label: "Company", type: "text" },
  { key: "address_line1", label: "Address line 1", type: "text" },
  { key: "address_line2", label: "Address line 2", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "state", label: "State", type: "text" },
  { key: "postal_code", label: "Postal code", type: "text" },
  { key: "country", label: "Country (2-letter code)", type: "text", required: true, default: "IN" },
  { key: "tax_id", label: "Tax ID (GSTIN)", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    default: "active",
    options: [
      { value: "active", label: "active" },
      { value: "inactive", label: "inactive" },
    ],
  },
  { key: "notes", label: "Notes", type: "textarea" },
];

const columns: ColumnDef[] = [
  { header: "Name", render: (r) => <span className="font-medium">{String(r.name)}</span> },
  { header: "Company", render: (r) => String(r.company ?? "—") },
  { header: "Email", render: (r) => String(r.email ?? "—") },
  { header: "Phone", render: (r) => String(r.phone ?? "—") },
  { header: "Status", render: (r) => <ActiveBadge active={r.status === "active"} /> },
];

export function CustomersScreen() {
  return (
    <ResourceManager
      endpoint="/api/customers"
      singular="customer"
      fields={fields}
      columns={columns}
      searchPlaceholder="Search name, company or email"
      statusOptions={[
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ]}
    />
  );
}
