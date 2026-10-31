/**
 * Sidebar = concatenation of each module's own nav list, so nobody edits this file
 * to add or change their menu entries – edit src/features/<module>/nav.ts instead.
 */
import { authDataNav } from "@/features/auth-data/nav";
import { subscriptionsNav } from "@/features/subscriptions/nav";
import { billingNav } from "@/features/billing/nav";
import { intelligenceNav } from "@/features/intelligence/nav";
import type { NavItem } from "@/types/nav";

export const NAV_ITEMS: NavItem[] = [
  ...intelligenceNav.slice(0, 1), // Dashboard first
  ...authDataNav,
  ...subscriptionsNav,
  ...billingNav,
  ...intelligenceNav.slice(1),
];
