"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface Holding {
  symbol: string;
  marketValue: number;
  allocation: number;
}

interface PortfolioPieProps {
  holdings: Holding[];
  cashBalance: number;
}

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#84cc16", // lime
  "#6366f1", // indigo
];

export function PortfolioPie({ holdings, cashBalance }: PortfolioPieProps) {
  const data = [
    { name: "Cash", value: cashBalance },
    ...holdings.map((h) => ({
      name: h.symbol.replace(/USDT$/, ""),
      value: h.marketValue,
    })),
  ];

  if (data.every((d) => d.value === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        No portfolio data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((_, idx) => (
            <Cell
              key={idx}
              fill={COLORS[idx % COLORS.length]}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => `$${value.toFixed(2)}`}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px" }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
