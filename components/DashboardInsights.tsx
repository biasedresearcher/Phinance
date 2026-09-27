"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { monthlyInsights } from "@/lib/dashboard-insights";
import { expenseBreakdown, formatCurrency, money } from "@/lib/finance-utils";
import type { FinanceData } from "@/lib/types";
import { Empty } from "./finance/UI";

const compact = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
export function DashboardInsights({
  data,
  month,
  today,
}: {
  data: FinanceData;
  month: string;
  today: string;
}) {
  const history = monthlyInsights(data.transactions, month, today);
  const expenses = expenseBreakdown(
    data.transactions,
    `${month}-01`,
    month < today.slice(0, 7) ? `${month}-31` : today,
  );
  const budgets = data.budgets.filter((budget) => budget.month === month);
  const hasHistory = history.some((row) => row.income || row.outflows);
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section className="app-card min-w-0 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              The bigger picture
            </p>
            <h2 className="mt-1 text-xl font-semibold">Income & outflows</h2>
          </div>
          <div className="flex gap-4 text-xs">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#6d7d41]" />
              Income
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#b75e3b]" />
              Outflows
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Six calendar months ending {month}. Outflows include expenses, EMI
          payments and investments. Transfers excluded.
        </p>
        {hasHistory ? (
          <>
            <div
              className="mt-5"
              role="img"
              aria-label="Monthly income and outflows bar chart. Exact figures are available below."
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={history}
                  margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    vertical={false}
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value: string) =>
                      new Date(`${value}-15T12:00:00`).toLocaleDateString(
                        "en-IN",
                        { month: "short" },
                      )
                    }
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#6f573d", fontSize: 12 }}
                  />
                  <YAxis
                    width={55}
                    tickFormatter={compact}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#6f573d", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar
                    name="Income"
                    dataKey="income"
                    fill="#6d7d41"
                    radius={[5, 5, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    name="Outflows"
                    dataKey="outflows"
                    fill="#b75e3b"
                    radius={[5, 5, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer">View monthly figures</summary>
              <div className="overflow-x-auto">
                <table className="mt-3 w-full text-left text-xs">
                  <caption className="sr-only">
                    Recorded monthly cash flow in rupees
                  </caption>
                  <thead>
                    <tr>
                      {["Month", "Income", "Outflows", "Net flow"].map(
                        (label) => (
                          <th className="p-2" key={label}>
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr
                        key={row.month}
                        className="border-t border-[var(--border)]"
                      >
                        <th className="p-2 font-normal">{row.month}</th>
                        <td className="p-2">{formatCurrency(row.income)}</td>
                        <td className="p-2">{formatCurrency(row.outflows)}</td>
                        <td className="p-2">{formatCurrency(row.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <div className="mt-6">
            <Empty>
              Your income and payments will build this picture as you record
              them.
            </Empty>
          </div>
        )}
      </section>
      <section className="app-card min-w-0 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
          Stay on track
        </p>
        <h2 className="mt-1 text-xl font-semibold">Budget pulse</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Calendar-month expenses · {month}
        </p>
        <div className="mt-6 space-y-5">
          {budgets.length ? (
            budgets.map((budget) => {
              const spent =
                expenses.find((row) => row.name === budget.category)?.value ??
                0;
              const remaining = money(budget.amount - spent);
              return (
                <div key={budget.id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <strong className="break-words">{budget.category}</strong>
                    <span className="shrink-0">{formatCurrency(spent)}</span>
                  </div>
                  <div
                    className="my-2 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${budget.amount > 0 ? Math.min(100, (spent / budget.amount) * 100) : spent > 0 ? 100 : 0}%`,
                        background:
                          remaining < 0 ? "var(--danger)" : "var(--olive)",
                      }}
                    />
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {formatCurrency(Math.abs(remaining))}{" "}
                    {remaining < 0 ? "over budget" : "left"} · Limit{" "}
                    {formatCurrency(budget.amount)}
                  </p>
                </div>
              );
            })
          ) : (
            <Empty>
              No budgets set for this month. Give your main spending categories
              a limit to see progress here.
            </Empty>
          )}
        </div>
        <a
          href="/planner"
          className="mt-6 inline-block text-sm font-semibold underline"
        >
          Manage budgets →
        </a>
      </section>
    </div>
  );
}
