import { AppShell } from "@/components/layout/app-shell";

// Shared shell (lead-owned). Member 1 adds the auth guard in src/lib/auth + middleware.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
