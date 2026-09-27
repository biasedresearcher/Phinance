"use client";
import { useState } from "react";
import { BudgetPulse, DashboardInsights } from "@/components/DashboardInsights";
import { AppShell } from "@/components/AppShell";
import { ExpenseBreakdownChart } from "@/components/ExpenseBreakdownChart";
import { Empty, Field, Notice } from "@/components/finance/UI";
import { useFinanceData } from "@/lib/use-finance-data";
import {
  cashFlow,
  expenseBreakdown,
  formatCurrency,
  money,
  spendingPlan,
} from "@/lib/finance-utils";
import {
  daysBetween,
  localDate,
  localMonth,
  monthDate,
  salaryCycle,
} from "@/lib/dates";

export default function DashboardPage() {
  const { data } = useFinanceData();
  const today = localDate();
  const [month, setMonth] = useState(localMonth);
  const [period, setPeriod] = useState("month");
  const [purchase, setPurchase] = useState("");
  const cycle = salaryCycle(today, data.settings.payday);
  const from = period === "cycle" ? cycle.start : `${month || localMonth()}-01`;
  const end = period === "cycle" ? today : monthDate(month || localMonth(), 31);
  const to = end > today ? today : end;
  const reportMonth =
    period === "cycle" ? today.slice(0, 7) : month || localMonth();
  const flow = cashFlow(data.transactions, from, to);
  const breakdown = expenseBreakdown(data.transactions, from, to);
  const plan = spendingPlan(data, today);
  const daysToPayday = Math.max(1, daysBetween(today, plan.payday));
  const daily = money(plan.available / daysToPayday);

  return (
    <AppShell
      compact
      title="Your money, in view"
      subtitle="Your payday outlook and spending, at a glance."
    >
      {!data.accounts.length ? (
        <Notice>
          Start by{" "}
          <a className="underline" href="/accounts">
            adding an account and opening balance
          </a>
          , then record your salary. Set your payday and recurring bills in{" "}
          <a className="underline" href="/planner">
            Plan
          </a>
          . Sample data is available separately in Settings.
        </Notice>
      ) : null}
      <section
        aria-labelledby="payday-title"
        className="overflow-hidden rounded-2xl border border-[#556533] bg-gradient-to-br from-[#556533] to-[#34412b] p-4 text-[#fff8eb] sm:p-5"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="min-w-0">
            <h2 id="payday-title" className="text-sm font-medium">
              Available until payday{" "}
              <span className="ml-2 text-xs text-[#e1e5d5]">· Today</span>
            </h2>
            <p
              className={`mt-1 leading-tight font-semibold tracking-tight break-all tabular-nums ${Math.abs(plan.available) >= 1e7 && !plan.incomplete ? "text-[clamp(1.25rem,5vw,3rem)]" : "text-[clamp(1.875rem,7vw,3rem)]"}`}
            >
              {plan.incomplete
                ? "Review accounts"
                : formatCurrency(plan.available)}
            </p>
            <p className="mt-1 text-xs text-[#e1e5d5]">
              After commitments and protected money.
            </p>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm sm:block sm:shrink-0 sm:text-right">
            {plan.incomplete ? (
              <a href="/accounts" className="underline">
                Complete account assignments
              </a>
            ) : (
              <p>
                <strong className="font-semibold tabular-nums">
                  {formatCurrency(daily)}
                </strong>{" "}
                <span className="text-xs text-[#e1e5d5]">/ day</span>
              </p>
            )}
            <p className="text-xs text-[#e1e5d5] sm:mt-1">
              {daysToPayday} days to payday · {plan.payday}
            </p>
          </div>
        </div>
        <dl className="mt-4 grid gap-2 border-t border-white/20 pt-3 sm:grid-cols-3 sm:gap-4">
          {[
            { label: "Spendable account balances", value: plan.cash },
            { label: "Unpaid commitments before payday", value: plan.due },
            {
              label: "Protected money in these accounts",
              value: plan.reserved,
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex min-w-0 items-baseline justify-between gap-3 sm:block"
            >
              <dt className="text-xs text-[#e1e5d5]">{label}</dt>
              <dd className="shrink-0 text-right text-sm font-semibold whitespace-nowrap tabular-nums sm:mt-1 sm:text-left sm:text-base sm:break-all sm:whitespace-normal">
                {formatCurrency(value)}
              </dd>
            </div>
          ))}
        </dl>
        <details className="mt-2 text-xs text-[#e1e5d5]">
          <summary className="w-fit cursor-pointer py-2 underline decoration-white/40 underline-offset-4">
            How this allowance works
          </summary>
          <p className="max-w-3xl pb-1 leading-relaxed">
            This allowance uses recorded account balances and commitments,
            including overdue bills, loan instalments and SIP plans. Expected
            salary is not included until credited. Protected cash should exclude
            money already held in accounts you marked non-spendable. Reconcile
            balances with your bank.
          </p>
        </details>
      </section>
      <section aria-label="Financial report" className="space-y-3">
        <div className="grid grid-cols-2 items-end gap-x-3 gap-y-2 sm:flex sm:flex-wrap sm:gap-4">
          <Field label="Report period">
            <select
              className="app-input"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="month">Calendar month</option>
              <option value="cycle">Current salary cycle</option>
            </select>
          </Field>
          {period === "month" ? (
            <Field label="Month">
              <input
                className="app-input"
                type="month"
                max={localMonth()}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </Field>
          ) : null}
          <p className="col-span-2 text-xs text-[var(--muted-foreground)] tabular-nums sm:pb-3">
            {from} to {to}
          </p>
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
          <DashboardInsights data={data} month={reportMonth} today={today} />
          <section className="app-card min-w-0 p-4 sm:p-5">
            <h2 className="text-lg font-semibold">Where spending went</h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Expenses in your selected report period
            </p>
            <div className="mt-3">
              <ExpenseBreakdownChart data={breakdown} />
            </div>
          </section>
        </div>
        <section
          aria-label="Report totals"
          className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
        >
          <h2 className="border-b border-[var(--border)] px-3 py-2 text-sm font-semibold lg:px-4">
            Report totals{" "}
            <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
              Selected period
            </span>
          </h2>
          <dl className="grid grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Income received", value: flow.income },
              { label: "Expenses paid", value: flow.expenses },
              { label: "Loan payments made", value: flow.loanPayments },
              { label: "Investment contributions", value: flow.investments },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="min-w-0 border-b border-[var(--border)] px-3 py-2.5 odd:border-r lg:border-r lg:border-b-0 lg:px-4 lg:py-3"
              >
                <dt className="text-xs text-[var(--muted-foreground)]">
                  {label}
                </dt>
                <dd className="mt-0.5 text-base font-semibold break-words tabular-nums sm:text-lg">
                  {formatCurrency(value)}
                </dd>
              </div>
            ))}
            <div className="col-span-2 flex min-w-0 items-center justify-between gap-3 bg-[var(--surface-muted)] px-3 py-2.5 lg:col-span-1 lg:block lg:px-4 lg:py-3">
              <dt className="text-xs text-[var(--muted-foreground)]">
                Recorded cash-flow surplus
              </dt>
              <dd
                className={`text-right text-base font-semibold break-words tabular-nums sm:text-lg lg:mt-0.5 lg:text-left ${flow.surplus < 0 ? "text-[var(--danger)]" : "text-[var(--olive-strong)]"}`}
              >
                {formatCurrency(flow.surplus)}
              </dd>
            </div>
          </dl>
          <p className="border-t border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] lg:px-4">
            Cash flow excludes transfers; it is not your bank balance.
          </p>
        </section>
      </section>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <BudgetPulse data={data} month={reportMonth} today={today} />
        <div className="space-y-4">
          <section className="app-card p-4 sm:p-5">
            <h2 className="mb-3 text-lg font-semibold">Upcoming & overdue</h2>
            {plan.pending.length ? (
              <ul className="space-y-2">
                {plan.pending.slice(0, 6).map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between gap-3 border-b border-[var(--border)] pb-2 text-sm"
                  >
                    <span className="min-w-0 break-words">
                      {c.name}
                      <span className="block text-xs text-[var(--muted-foreground)]">
                        {c.date}
                        {c.date < today ? " · overdue" : ""}
                      </span>
                    </span>
                    <strong className="text-right break-words tabular-nums">
                      {formatCurrency(c.amount)}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No unpaid commitments recorded before payday.</Empty>
            )}
            <a href="/planner" className="mt-3 inline-block text-sm underline">
              Manage plans and record payments
            </a>
          </section>
          <section className="app-card space-y-3 p-4 sm:p-5">
            <h2 className="text-lg font-semibold">What if I buy this?</h2>
            <Field label="Purchase cost (₹)">
              <input
                className="app-input"
                type="number"
                min="0"
                step="0.01"
                value={purchase}
                onChange={(e) => setPurchase(e.target.value)}
              />
            </Field>
            {purchase !== "" && !plan.incomplete ? (
              <p role="status" className="text-sm">
                Remaining allowance:{" "}
                <strong className="tabular-nums">
                  {formatCurrency(
                    money(plan.available - Math.max(0, Number(purchase))),
                  )}
                </strong>
                {plan.available - Number(purchase) < 0
                  ? ". This would use money allocated to commitments or protected savings."
                  : "."}
              </p>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Preview the effect on your allowance. No transaction is created.
              </p>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
