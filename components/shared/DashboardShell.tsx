"use client";
// components/shared/DashboardShell.tsx
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ClipboardList,
  Cog,
  CalendarCheck,
  ListChecks,
  Package,
  Moon,
  Sun,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";
import { NotificationBell } from "@/components/shared/NotificationBell";

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; moduleKey: string }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, moduleKey: "dashboard" },
  { href: "/work-orders", label: "Work Orders", icon: ClipboardList, moduleKey: "workOrder" },
  { href: "/machines", label: "Machines", icon: Cog, moduleKey: "machine" },
  { href: "/pm", label: "Preventive Maintenance", icon: CalendarCheck, moduleKey: "pm" },
  { href: "/check-sheets", label: "Check Sheets", icon: ListChecks, moduleKey: "checkSheet" },
  { href: "/spare-parts", label: "Spare Parts", icon: Package, moduleKey: "sparePart" },
];

export function DashboardShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function toggleDark() {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 -translate-x-full border-r border-border bg-background transition-transform md:static md:translate-x-0",
          sidebarOpen && "translate-x-0"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4 font-semibold">
          CMMS Pro
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <button
            className="md:hidden"
            onClick={() => setSidebarOpen((s) => !s)}
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
          <div className="hidden font-medium md:block">CMMS Pro</div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button onClick={toggleDark} aria-label="Toggle dark mode">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              aria-label="Sign out"
              className="flex items-center gap-1 text-sm"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
