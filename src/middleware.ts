import type { NextRequest } from "next/server";
import { guardRequest } from "@/lib/auth/middleware-guard";

// Owner: Member 1 (route guards). guardRequest() refreshes the Supabase session cookie AND applies the
// sign-in / role rules in src/lib/auth/guards.ts. API routes are not redirected: they use authorize().
export async function middleware(request: NextRequest) {
  return guardRequest(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
