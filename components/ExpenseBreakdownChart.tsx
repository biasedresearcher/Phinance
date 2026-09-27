"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/finance-utils";

const COLORS = [
  "#b75e3b",
  "#8f5f44",
  "#6d7d41",
  "#a68a52",
  "#c97447",
  "#7f6b4d",
  "#4f5c34",
];

export function ExpenseBreakdownChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        No expenses logged for this period yet.
      </p>
    );
  }

  const total = data.reduce((sum, row) => sum + row.value, 0);
  return (
    <div className="w-full min-w-0">
      <div className="h-44 sm:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                borderColor: "#d3c2aa",
                boxShadow: "0 10px 24px -16px rgba(61, 42, 27, 0.45)",
                backgroundColor: "#f8f0e3",
              }}
              formatter={(value) => formatCurrency(Number(value ?? 0))}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 space-y-1 text-sm">
        {data.map((item, index) => (
          <div
            className="flex items-baseline gap-2 border-b border-[var(--border)] py-2 last:border-0"
            key={item.name}
          >
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="min-w-0 break-words text-[var(--muted-foreground)]">
              {item.name} ·{" "}
              {total > 0 ? Math.round((item.value / total) * 100) : 0}%
            </span>
            <span className="ml-auto text-right font-semibold break-words text-[var(--foreground)] tabular-nums">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
