import type { LucideIcon } from "lucide-react";
import type { UserRole } from "./enums";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles allowed to see the item. Omit = all staff-side roles. */
  roles?: UserRole[];
}
