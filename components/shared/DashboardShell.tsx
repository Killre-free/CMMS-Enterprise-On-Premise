"use client";
// components/shared/DashboardShell.tsx
import { useState, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Cog,
  CalendarCheck,
  ListChecks,
  Package,
  Users,
  ScrollText,
  Settings as SettingsIcon,
  FileBarChart,
  Bell,
  Moon,
  Sun,
  LogOut,
  Menu,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";
import { NotificationBell } from "@/components/shared/NotificationBell";

const NAV_ITEMS: { href: string; labelKey: string; icon: typeof LayoutDashboard; moduleKey: string }[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard, moduleKey: "dashboard" },
  { href: "/work-orders", labelKey: "workOrders", icon: ClipboardList, moduleKey: "workOrder" },
  { href: "/machines", labelKey: "machines", icon: Cog, moduleKey: "machine" },
  { href: "/pm", labelKey: "pm", icon: CalendarCheck, moduleKey: "pm" },
  { href: "/check-sheets", labelKey: "checkSheets", icon: ListChecks, moduleKey: "checkSheet" },
  { href: "/spare-parts", labelKey: "spareParts", icon: Package, moduleKey: "sparePart" },
  { href: "/reports", labelKey: "reports", icon: FileBarChart, moduleKey: "reports" },
  { href: "/notifications", labelKey: "notifications", icon: Bell, moduleKey: "notification" },
  { href: "/users", labelKey: "users", icon: Users, moduleKey: "users" },
  { href: "/audit-log", labelKey: "auditLog", icon: ScrollText, moduleKey: "auditLog" },
  { href: "/settings", labelKey: "settings", icon: SettingsIcon, moduleKey: "settings" },
];

export function DashboardShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function toggleDark() {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }

  function toggleLocale() {
    const next = locale === "en" ? "th" : "en";
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 -translate-x-full border-r border-border bg-background transition-transform md:static md:translate-x-0 print:hidden",
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
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 print:hidden">
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
            <button onClick={toggleLocale} aria-label="Switch language" className="flex items-center gap-1 text-sm">
              <Languages size={18} />
              {locale === "en" ? "TH" : "EN"}
            </button>
            <button onClick={toggleDark} aria-label="Toggle dark mode">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: locale === "en" ? "/login" : `/${locale}/login` })}
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
