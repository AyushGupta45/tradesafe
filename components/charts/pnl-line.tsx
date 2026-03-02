"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface PnlDataPoint {
  date: string;
  pnl: number;
  tradeCount: number;
}

interface PnlLineProps {
  data: PnlDataPoint[];
}

export function PnlLine({ data }: PnlLineProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        No PnL history yet. Execute some trades to see your performance.
      </div>
    );
  }

  const maxPnl = Math.max(...data.map((d) => d.pnl));
  const minPnl = Math.min(...data.map((d) => d.pnl));
  const currentPnl = data[data.length - 1]?.pnl ?? 0;
  const isPositive = currentPnl >= 0;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          opacity={0.5}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(d: string) => {
            const parts = d.split("-");
            return `${parts[1]}/${parts[2]}`;
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          domain={[Math.min(minPnl * 1.1, -10), Math.max(maxPnl * 1.1, 10)]}
        />
        <Tooltip
          formatter={(value: number) => [`$${value.toFixed(2)}`, "PnL"]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
        />
        <ReferenceLine
          y={0}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="3 3"
          opacity={0.5}
        />
        <Line
          type="monotone"
          dataKey="pnl"
          stroke={isPositive ? "#10b981" : "#ef4444"}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
