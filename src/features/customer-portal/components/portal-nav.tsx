"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Repeat2,
  LayoutDashboard,
  Receipt,
  CreditCard,
  Menu,
  X,
  Building2,
  Repeat,
} from "lucide-react";
import type { Customer } from "@/types";
import { cn } from "@/lib/utils";

interface PortalNavProps {
  customer: Customer;
}

export function PortalNav({ customer }: PortalNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Overview", href: "/customer-portal", icon: LayoutDashboard },
    { label: "Subscriptions", href: "/customer-portal/subscriptions", icon: Repeat },
    { label: "Invoices", href: "/customer-portal/invoices", icon: Receipt },
    { label: "Payments", href: "/customer-portal/payments", icon: CreditCard },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/customer-portal" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0A2540] text-[#00D4B2] shadow-xs">
              <Repeat2 className="h-5 w-5" />
            </span>
            <div>
              <span className="text-base font-bold tracking-tight text-[#0A2540]">SubscriptIQ</span>
              <span className="ml-1.5 rounded-sm bg-[#635BFF]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#635BFF]">
                Customer Portal
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ label, href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-[#635BFF]/10 text-[#635BFF]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Customer Identity Card */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right leading-tight">
            <p className="text-xs font-bold text-[#0A2540]">{customer.name}</p>
            <div className="flex items-center gap-1 justify-end text-[11px] text-slate-500">
              {customer.company && (
                <>
                  <Building2 className="h-3 w-3 text-slate-400" />
                  <span>{customer.company}</span>
                </>
              )}
            </div>
          </div>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#0A2540] text-xs font-semibold text-white">
            {customer.name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((p) => !p)}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white p-4 md:hidden animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-1 pb-3 border-b">
            {navLinks.map(({ label, href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-[#635BFF]/10 text-[#635BFF]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="pt-3 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-[#0A2540]">{customer.name}</p>
              <p className="text-slate-500">{customer.company || customer.email}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 text-[10px]">
              Active Account
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
