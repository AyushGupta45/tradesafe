"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ScanSearch,
  Bot,
  Settings,
  Wallet,
  ChevronLeft,
  Zap,
  LogOut,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayout } from "@/context/LayoutContext";
import { useSession, signOut } from "@/lib/auth-client";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Scan & Analyze", href: "/arbitrage", icon: ScanSearch },
  { name: "Trade", href: "/trade", icon: ArrowRightLeft },
  { name: "Portfolio", href: "/portfolio", icon: Wallet },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Settings", href: "/settings", icon: Settings },
];

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggleSidebar } = useLayout();
  const { data: session } = useSession();

  const userName = session?.user?.name || "User";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "h-14 flex items-center border-b",
          collapsed ? "justify-center px-1" : "justify-between px-3",
        )}
      >
        {collapsed ? (
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"
            title="Expand sidebar"
          >
            <Zap className="w-4 h-4 text-primary-foreground" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm tracking-tight truncate">
                TradeSafe
              </span>
            </div>
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={16} />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-2 border-t space-y-1">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md",
            collapsed ? "justify-center" : "",
          )}
        >
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-xs font-medium">{initials}</span>
          </div>
          {!collapsed && <span className="text-sm truncate">{userName}</span>}
        </div>
        <button
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 w-full transition-colors",
            collapsed ? "justify-center" : "",
          )}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
