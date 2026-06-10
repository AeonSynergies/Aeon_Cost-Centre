"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Building2,
  Users,
  Activity,
  UserCog,
  Boxes,
  Layers,
  Briefcase,
  Receipt,
  PieChart,
  Wallet,
  Shield,
  ScrollText,
  Settings,
  PanelLeftClose,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useOpsStore } from "@/store/filterStore";
import { logoutAction } from "@/app/(dashboard)/actions";

import type { LucideIcon } from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean };

const GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Analytical",
    items: [
      { label: "Revenue", href: "/analytical/revenue", icon: TrendingUp },
      { label: "Departments", href: "/analytical/departments", icon: Building2 },
      { label: "Resources", href: "/analytical/resources", icon: Users },
      { label: "Utilisation", href: "/analytical/utilisation", icon: Activity },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Resources", href: "/resources", icon: UserCog },
      { label: "Departments", href: "/departments", icon: Building2 },
      { label: "Cost Centres", href: "/cost-centres", icon: Boxes },
      { label: "Services", href: "/services", icon: Layers },
      { label: "Clients", href: "/clients", icon: Briefcase },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Billing", href: "/billing", icon: Receipt },
      { label: "Allocation", href: "/allocation", icon: PieChart },
      { label: "Expenses", href: "/expenses", icon: Wallet },
    ],
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [
      { label: "Users", href: "/admin/users", icon: Shield },
      { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar({
  user,
}: {
  user: { name: string; role: string };
}) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useOpsStore();
  const collapsed = sidebarCollapsed;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-[#0F1629] text-white transition-all duration-150",
        collapsed ? "w-[56px]" : "w-[220px]"
      )}
    >
      <div className="flex h-[52px] items-center justify-between border-b border-[#243357] px-3">
        {!collapsed && (
          <div>
            <div className="text-[15px] font-bold leading-none">Aeon</div>
            <div className="text-[9px] text-[#7A8FAD]">Ops Controller</div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded p-1.5 text-[#7A8FAD] hover:bg-[#1A2540] hover:text-white"
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {GROUPS.filter((g) => !g.adminOnly || user.role === "ADMIN").map((group) => (
          <div key={group.label} className="mb-3 px-2">
            {!collapsed && (
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-[#3A4A6B]">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "mb-0.5 flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[12px] font-medium transition-colors",
                    active
                      ? "bg-[#3266AD] text-white"
                      : "text-[#7A8FAD] hover:bg-[#1A2540] hover:text-white",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon size={15} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#243357] p-2">
        <div className={cn("flex items-center gap-2 rounded-[7px] px-1.5 py-1.5", collapsed && "justify-center")}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3266AD] text-[11px] font-bold">
            {initials(user.name)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold">{user.name}</div>
              <div className="text-[9px] uppercase tracking-wide text-[#7A8FAD]">{user.role}</div>
            </div>
          )}
          {!collapsed && (
            <form action={logoutAction}>
              <button
                type="submit"
                title="Logout"
                className="rounded p-1.5 text-[#7A8FAD] hover:bg-[#1A2540] hover:text-white"
              >
                <LogOut size={14} />
              </button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
