"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Repeat2 } from "lucide-react";
import { NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        <Link href="/dashboard" className="flex items-center gap-2 px-5 py-4 text-lg font-semibold">
          <Repeat2 className="size-5 text-primary" /> SubscriptIQ
        </Link>
        <nav className="flex flex-col gap-0.5 px-3 pb-4">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  active && "bg-accent text-accent-foreground",
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t px-5 py-3 text-xs text-muted-foreground">
          <Link href="/health" className="hover:underline">
            System health
          </Link>
        </div>
      </aside>
      <nav className="flex gap-1 overflow-x-auto border-b bg-card px-3 py-2 md:hidden">
        {NAV_ITEMS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground",
              pathname.startsWith(href) && "bg-accent text-accent-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
