import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PageAuth } from "@/features/billing/auth";

const MESSAGES: Record<Exclude<PageAuth["status"], "ok">, { title: string; body: string }> = {
  not_configured: {
    title: "Supabase is not configured",
    body: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the dev server.",
  },
  unauthenticated: { title: "Sign in required", body: "You need to be signed in to view billing data." },
  no_profile: { title: "No profile found", body: "Your account has no profile row. Re-run the migrations or sign up again." },
};

export function AuthNotice({ status }: { status: Exclude<PageAuth["status"], "ok"> }) {
  const m = MESSAGES[status];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.title}</CardTitle>
        <CardDescription>{m.body}</CardDescription>
      </CardHeader>
      {status === "unauthenticated" && process.env.NODE_ENV !== "production" ? (
        <CardContent className="text-sm">
          Development only: <Link className="text-primary underline" href="/dev/sign-in">temporary sign-in page</Link>{" "}
          (remove once Member 1&apos;s login is merged).
        </CardContent>
      ) : null}
    </Card>
  );
}
