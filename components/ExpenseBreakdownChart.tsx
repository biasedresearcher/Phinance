"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#64748b"];

export function ExpenseBreakdownChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">No expenses logged for this month yet.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `₹${Number(value ?? 0).toLocaleString("en-IN")}`} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {data.map((item, index) => (
          <div className="flex items-center gap-2" key={item.name}>
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-slate-700">{item.name}</span>
            <span className="ml-auto font-medium">₹{item.value.toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
