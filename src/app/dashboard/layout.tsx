import { DashboardShell } from "@/components/dashboard/shell";
import { Toaster } from "@/components/ui/sonner";
import type { Role } from "@/lib/nav";

// TODO: replace with the session/role helper from Member 1 (see CONTRACTS.md).
// Customers must be redirected to /customer-portal here.
async function getSession(): Promise<{ role: Role; name: string }> {
  return { role: "admin", name: "Admin User" };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <DashboardShell role={session.role} userName={session.name}>
      {children}
      <Toaster richColors position="top-right" />
    </DashboardShell>
  );
}