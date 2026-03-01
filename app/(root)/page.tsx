"use client";

import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Shield,
  Bot,
  Globe,
  Activity,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Globe,
    title: "6 Live Exchanges",
    desc: "Fetches real-time prices from Binance, Kraken, KuCoin, Bybit, OKX, and Gate.io simultaneously.",
  },
  {
    icon: Bot,
    title: "AI Agent Debate",
    desc: "Bull, Bear, and Mediator agents powered by Llama 3.3 debate every opportunity before trade.",
  },
  {
    icon: Shield,
    title: "Risk Guardian",
    desc: "Automated risk scoring, capital allocation, and guardian veto system protect your portfolio.",
  },
  {
    icon: Activity,
    title: "Simulated Execution",
    desc: "Realistic trade simulation with slippage modeling — learn without risking real capital.",
  },
];

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">TradeSafe</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </Button>
          {session?.user ? (
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-28 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Multi-Agent Arbitrage Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Detect. Debate. Execute.
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            TradeSafe scans 6 crypto exchanges in real-time, runs AI agent
            debates on every opportunity, and simulates trades — all powered by
            Llama 3.3.
          </p>

          <div className="flex justify-center gap-3 pt-2">
            <Link href={session?.user ? "/dashboard" : "/signup"}>
              <Button size="lg">
                {session?.user ? "Go to Dashboard" : "Start Free"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="pb-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="rounded-xl border bg-card p-6 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-28 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-6 rounded-2xl border bg-card p-12">
          <h2 className="text-3xl font-bold">Ready to explore arbitrage?</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Sign up in seconds and start scanning across Binance, Kraken,
            KuCoin, Bybit, OKX, and Gate.io.
          </p>
          <Link href={session?.user ? "/dashboard" : "/signup"}>
            <Button size="lg">
              {session?.user ? "Open Dashboard" : "Create Account"}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">TradeSafe</span>
          </div>
          <p>Built for Mumbai Hacks 2024</p>
        </div>
      </footer>
    </div>
  );
}
