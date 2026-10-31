import { LayoutDashboard, TrendingUp } from "lucide-react";
import type { NavItem } from "@/types/nav";

// Owned by intelligence. Add/edit menu entries here – not in src/config/navigation.ts.
export const intelligenceNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/analytics", icon: TrendingUp },
];
