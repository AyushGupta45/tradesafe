"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

export interface KlinePoint {
  time: string;
  close: number;
}

interface MiniPriceChartProps {
  data: KlinePoint[];
  loading?: boolean;
  symbol?: string;
}

export function MiniPriceChart({ data, loading, symbol }: MiniPriceChartProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading price chart…
        </div>
      </div>
    );
  }

  if (data.length === 0) return null;

  const first = data[0].close;
  const last = data[data.length - 1].close;
  const change = ((last - first) / first) * 100;
  const isPositive = change >= 0;
  const strokeColor = isPositive ? "#10b981" : "#ef4444";

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {symbol && (
            <span className="text-muted-foreground">
              {symbol.replace(/USDT$/, "")}/USDT
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            12h · 15m candles
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono font-medium">
            $
            {last.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span
            className={`text-xs font-medium ${isPositive ? "text-emerald-500" : "text-red-500"}`}
          >
            {isPositive ? "+" : ""}
            {change.toFixed(2)}%
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 5, bottom: 0, left: 5 }}
        >
          <XAxis
            dataKey="time"
            tick={false}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            formatter={(value: number) => [
              `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              "Price",
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "11px",
            }}
            labelFormatter={(label: string) => {
              const d = new Date(label);
              return d.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
            }}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: strokeColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
