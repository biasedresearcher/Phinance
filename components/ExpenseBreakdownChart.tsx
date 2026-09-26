"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

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

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={288}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={98}
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
            formatter={(value) =>
              `₹${Number(value ?? 0).toLocaleString("en-IN")}`
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {data.map((item, index) => (
          <div
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2"
            key={item.name}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-[var(--muted-foreground)]">
              {item.name} ·{" "}
              {Math.round(
                (item.value /
                  data.reduce((total, row) => total + row.value, 0)) *
                  100,
              )}
              %
            </span>
            <span className="ml-auto font-semibold text-[var(--foreground)]">
              ₹{item.value.toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
