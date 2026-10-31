"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Brand } from "./sidebar";
import { SidebarNav } from "./sidebar-nav";
import type { Role } from "@/lib/nav";

export function Header({ role, userName }: { role: Role; userName: string }) {
  const [open, setOpen] = useState(false);
  const initials = userName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand />
          <SidebarNav role={role} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="ml-auto flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-[#0A2540]">{userName}</p>
          <p className="text-xs capitalize text-slate-500">{role}</p>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0A2540] text-xs font-semibold text-white">
          {initials}
        </span>
      </div>
    </header>
  );
}