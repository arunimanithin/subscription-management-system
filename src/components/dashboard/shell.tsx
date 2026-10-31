import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { Role } from "@/lib/nav";

export function DashboardShell({ role, userName, children }: { role: Role; userName: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-[#0A2540]">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header role={role} userName={userName} />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}