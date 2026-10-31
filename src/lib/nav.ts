import {
  LayoutDashboard, Users, Package, Layers, Repeat, FileText, Receipt,
  CreditCard, Percent, Radar, RefreshCw, BarChart3, Settings, type LucideIcon,
} from "lucide-react";

export type Role = "admin" | "staff" | "customer";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
};

// NOTE: hrefs are assumptions. Align with CONTRACTS.md before merging.
export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "staff"] },
  { label: "Customers", href: "/dashboard/customers", icon: Users, roles: ["admin", "staff"] },
  { label: "Products", href: "/dashboard/products", icon: Package, roles: ["admin", "staff"] },
  { label: "Plans", href: "/dashboard/plans", icon: Layers, roles: ["admin", "staff"] },
  { label: "Subscriptions", href: "/dashboard/subscriptions", icon: Repeat, roles: ["admin", "staff"] },
  { label: "Quotations", href: "/dashboard/quotations", icon: FileText, roles: ["admin", "staff"] },
  { label: "Invoices", href: "/dashboard/invoices", icon: Receipt, roles: ["admin", "staff"] },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard, roles: ["admin", "staff"] },
  { label: "Discounts", href: "/dashboard/discounts", icon: Percent, roles: ["admin"] },
  { label: "Revenue Leak Radar", href: "/dashboard/revenue-leak-radar", icon: Radar, roles: ["admin", "staff"] },
  { label: "Renewal Center", href: "/dashboard/renewals", icon: RefreshCw, roles: ["admin", "staff"] },
  { label: "Analytics", href: "/analytics", icon: BarChart3, roles: ["admin", "staff"] },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["admin"] },
];

export const navForRole = (role: Role) => NAV_ITEMS.filter((i) => i.roles.includes(role));