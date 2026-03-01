"use client";

import { LayoutProvider, useLayout } from "@/context/LayoutContext";
import Sidebar from "@/components/layout/Sidebar";
import TopNavbar from "@/components/layout/TopNavbar";
import { cn } from "@/lib/utils";

function LayoutShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useLayout();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopNavbar />
      <main
        className={cn(
          "pt-14 transition-all duration-300 min-h-screen",
          collapsed ? "ml-16" : "ml-60",
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutProvider>
      <LayoutShell>{children}</LayoutShell>
    </LayoutProvider>
  );
}
