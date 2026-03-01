"use client";

import { Sun, Moon, User, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useLayout } from "@/context/LayoutContext";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TopNavbar = () => {
  const { collapsed } = useLayout();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-14 z-30 flex items-center justify-between px-6 border-b bg-card/80 backdrop-blur-sm transition-all duration-300",
        collapsed ? "left-16" : "left-60",
      )}
    >
      <div />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-8 w-8"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User dropdown placeholder */}
        {session?.user && (
          <div className="flex items-center gap-2 pl-2 border-l">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <span className="text-sm hidden md:block">{session.user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopNavbar;
