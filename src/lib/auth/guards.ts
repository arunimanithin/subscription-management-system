import type { UserRole } from "@/types/enums";

/**
 * Route guard rules (pure functions, unit-tested). Used by src/middleware.ts.
 * Middleware is only the first line of defence: every API route still calls authorize()
 * and Postgres Row Level Security still decides which rows a user can touch.
 */

/** Where each role lands after signing in. */
export const HOME_BY_ROLE: Record<UserRole, string> = {
  admin: "/dashboard",
  staff: "/dashboard",
  customer: "/customer-portal",
};

/** Pages anyone may open without signing in. */
const PUBLIC_PREFIXES = ["/auth", "/health", "/dev"]; // /dev = temporary sign-in helper used while login was being built

/** Pages a signed-in user has no reason to see (they are sent to their home page instead). */
const GUEST_ONLY = ["/auth/login", "/auth/register"];

/** The customer-facing area. "/portal" is the older placeholder; "/customer-portal" is the real portal. */
const CUSTOMER_AREA_PREFIXES = ["/customer-portal", "/portal"];

/** Pages that only admins may open. */
const ADMIN_ONLY_PREFIXES = ["/users"];

const startsWithPath = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export interface GuardInput {
  pathname: string;
  /** Query string including the leading "?", or "". Used to send the visitor back after signing in. */
  search?: string;
  signedIn: boolean;
  /** null = signed in but the role could not be read (never lock the user out because of that). */
  role: UserRole | null;
}

export type GuardDecision = { action: "allow" } | { action: "redirect"; to: string };

/**
 * Accepts only a same-site relative path (e.g. "/invoices?status=overdue").
 * Anything else (absolute URLs, "//evil.com", backslashes, auth pages) returns null, so the
 * "?next=" parameter can never be used as an open redirect.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /[\u0000-\u001f]/.test(raw)) return null;
  if (raw === "/auth" || raw.startsWith("/auth/") || raw.startsWith("/auth?")) return null;
  return raw;
}

export function decideRoute({ pathname, search = "", signedIn, role }: GuardInput): GuardDecision {
  // API routes answer with JSON 401/403 themselves; redirecting them would break fetch() callers.
  if (pathname === "/api" || pathname.startsWith("/api/")) return { action: "allow" };

  if (PUBLIC_PREFIXES.some((p) => startsWithPath(pathname, p))) {
    if (signedIn && role && GUEST_ONLY.includes(pathname)) return { action: "redirect", to: HOME_BY_ROLE[role] };
    return { action: "allow" };
  }

  if (!signedIn) {
    const next = safeNext(pathname + search);
    return { action: "redirect", to: next && next !== "/" ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login" };
  }

  if (!role) return { action: "allow" };

  if (pathname === "/") return { action: "redirect", to: HOME_BY_ROLE[role] };

  const inPortal = CUSTOMER_AREA_PREFIXES.some((p) => startsWithPath(pathname, p));
  if (role === "customer") return inPortal ? { action: "allow" } : { action: "redirect", to: HOME_BY_ROLE.customer };

  // admin / staff
  if (inPortal) return { action: "redirect", to: HOME_BY_ROLE[role] };
  if (role !== "admin" && ADMIN_ONLY_PREFIXES.some((p) => startsWithPath(pathname, p))) {
    return { action: "redirect", to: HOME_BY_ROLE[role] };
  }
  return { action: "allow" };
}
