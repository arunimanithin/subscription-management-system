import { Repeat } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import type { Role } from "@/lib/nav";

export function Brand() {
  return (
    <div className="flex h-14 items-center gap-2 px-6">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-[#635BFF] text-white">
        <Repeat className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-base font-semibold tracking-tight text-[#0A2540]">SubscriptIQ</span>
    </div>
  );
}

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <Brand />
      <div className="flex-1 overflow-y-auto py-2">
        <SidebarNav role={role} />
      </div>
    </aside>
  );
}