"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bot,
  Shield,
  BrainCircuit,
  TrendingUp,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

const agents = [
  {
    name: "Price Discovery",
    description:
      "Fetches real-time bid/ask from Binance, Kraken, KuCoin, Bybit, Gate.io using Promise.allSettled for resilience.",
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    name: "Risk Assessment",
    description:
      "Evaluates spread-to-fee ratio, price divergence, volatility anomalies. Returns riskScore (0-100) and recommendation.",
    icon: Shield,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    name: "Capital Allocation",
    description:
      "Tiered position sizing: extreme risk → 2%, high → 5%, medium → 10%, low → 15% of portfolio. Respects guardian limits.",
    icon: Zap,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    name: "Debate System",
    description:
      "3-agent debate (Bull/Bear/Mediator) using Llama 3.3 via Groq → OpenRouter → NVIDIA cascade. Produces verdict + confidence.",
    icon: BrainCircuit,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    name: "Execution Engine",
    description:
      "Simulates realistic trade execution with random slippage (0.01-0.05%), fee modeling, and full portfolio DB updates.",
    icon: Bot,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

interface Debate {
  id: number;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  spreadPercent: number;
  recommendation: string;
  reasoning: string;
  createdAt: string;
  consensus: any;
}

export default function AgentsPage() {
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDebates = useCallback(async () => {
    try {
      const res = await fetch("/api/debates");
      if (res.ok) {
        const data = await res.json();
        setDebates(data.debates || []);
      }
    } catch (err) {
      console.error("Failed to fetch debates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDebates();
  }, [fetchDebates]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agents</h1>
        <p className="text-muted-foreground">
          The 5 AI agents powering the arbitrage pipeline
        </p>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className="rounded-lg border bg-card p-5 space-y-3 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg ${agent.bgColor} flex items-center justify-center`}
              >
                <agent.icon className={`w-4.5 h-4.5 ${agent.color}`} />
              </div>
              <h3 className="font-semibold text-sm">{agent.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {agent.description}
            </p>
          </div>
        ))}
      </div>

      {/* Debate History */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Debate History</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : debates.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No debates yet. Run a scan and click &quot;Debate&quot; on an
            opportunity.
          </div>
        ) : (
          <div className="divide-y">
            {debates.map((d) => (
              <div key={d.id} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {d.recommendation === "execute" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-orange-500" />
                    )}
                    <span className="font-medium text-sm">{d.symbol}</span>
                    <span className="text-xs text-muted-foreground">
                      {d.buyExchange} → {d.sellExchange}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        d.recommendation === "execute"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-orange-500/10 text-orange-500"
                      }`}
                    >
                      {d.recommendation?.toUpperCase()}
                    </span>
                    {d.consensus?.confidence && (
                      <span className="text-xs text-muted-foreground">
                        {d.consensus.confidence}% conf.
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {new Date(d.createdAt).toLocaleString()}
                  <span className="mx-1">·</span>
                  Spread: {d.spreadPercent?.toFixed(3)}%
                </div>
                {d.reasoning && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {d.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
