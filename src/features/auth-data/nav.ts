import { Layers, Package, UserCog, Users } from "lucide-react";
import type { NavItem } from "@/types/nav";

// Owned by authData. Add/edit menu entries here – not in src/config/navigation.ts.
export const authDataNav: NavItem[] = [
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Products", href: "/products", icon: Package },
  { label: "Plans", href: "/plans", icon: Layers },
  { label: "Users", href: "/users", icon: UserCog },
];
