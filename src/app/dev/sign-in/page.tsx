import { notFound } from "next/navigation";
import { DevSignIn } from "@/features/billing/components/dev-sign-in";

// TEMPORARY (billing, Member 3): remove when Member 1's /auth/login is merged. Never served in production.
export default function DevSignInPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto max-w-md p-6">
      <DevSignIn />
    </main>
  );
}
