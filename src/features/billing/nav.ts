import { CreditCard, Receipt } from "lucide-react";
import type { NavItem } from "@/types/nav";

// Owned by billing. Add/edit menu entries here – not in src/config/navigation.ts.
export const billingNav: NavItem[] = [
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Payments", href: "/payments", icon: CreditCard },
];
