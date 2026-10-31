import { buildCrud } from "@/features/auth-data/crud";
import {
  createCustomerSchema,
  createPlanSchema,
  createProductSchema,
  updateCustomerSchema,
  updatePlanSchema,
  updateProductSchema,
} from "@/types/schemas";

export const customersCrud = buildCrud({
  table: "customers",
  select: "*",
  label: "Customer",
  createSchema: createCustomerSchema,
  updateSchema: updateCustomerSchema,
  searchColumns: ["name", "email", "company"],
  status: { column: "status", kind: "text" },
  stampCreatedBy: true,
  readRoles: ["admin", "staff"],
});

export const productsCrud = buildCrud({
  table: "products",
  select: "*",
  label: "Product",
  createSchema: createProductSchema,
  updateSchema: updateProductSchema,
  searchColumns: ["name", "sku", "category"],
  status: { column: "is_active", kind: "boolean" },
  stampCreatedBy: true,
});

export const plansCrud = buildCrud({
  table: "plans",
  select: "*, product:products(id, name)",
  label: "Plan",
  createSchema: createPlanSchema,
  updateSchema: updatePlanSchema,
  searchColumns: ["name", "description"],
  status: { column: "is_active", kind: "boolean" },
  filterByProduct: true,
});
