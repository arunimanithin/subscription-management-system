import { PageHeader } from "@/components/shared/page-header";
import { UsersManager } from "@/features/auth-data/components/users-manager";

// Admin only: src/lib/auth/guards.ts sends staff away from /users and /api/users answers 403.
export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users" description="Everyone who can sign in, and what they are allowed to do. New sign-ups start as customers." />
      <UsersManager />
    </>
  );
}
