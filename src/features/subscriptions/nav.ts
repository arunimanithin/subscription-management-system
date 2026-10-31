import { FileText, Repeat } from "lucide-react";
import type { NavItem } from "@/types/nav";

// Owned by subscriptions. Add/edit menu entries here – not in src/config/navigation.ts.
export const subscriptionsNav: NavItem[] = [
  { label: "Subscriptions", href: "/subscriptions", icon: Repeat },
  { label: "Quotations", href: "/quotations", icon: FileText },
];
