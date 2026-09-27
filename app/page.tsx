"use client";
import { useState } from "react";
import { DashboardInsights } from "@/components/DashboardInsights";
import { AppShell } from "@/components/AppShell";
import { ExpenseBreakdownChart } from "@/components/ExpenseBreakdownChart";
import { Empty, Field, Notice, Stat } from "@/components/finance/UI";
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
  const flow = cashFlow(data.transactions, from, to);
  const breakdown = expenseBreakdown(data.transactions, from, to);
  const plan = spendingPlan(data, today);
  const daily = money(
    plan.available / Math.max(1, daysBetween(today, plan.payday)),
  );
  return (
    <AppShell
      title="Your money, in view"
      subtitle="A clear view of what you have, what is committed, and what remains until payday."
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
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[#556533] to-[#34412b] p-6 text-[#fff8eb] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
              Your payday outlook · Today
            </p>
            <h2 className="mt-3 text-lg">Available until payday</h2>
            <p className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
              {plan.incomplete
                ? "Review accounts"
                : formatCurrency(plan.available)}
            </p>
            <p className="mt-3 max-w-lg text-sm opacity-80">
              After recorded commitments and protected money. Updates when your
              entries change or cloud changes arrive.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
            <p className="text-3xl font-semibold">
              {Math.max(1, daysBetween(today, plan.payday))}
              <span className="ml-2 text-sm font-normal">days to payday</span>
            </p>
            <p className="mt-2 text-sm">
              {plan.incomplete
                ? "Complete account assignments first"
                : `${formatCurrency(daily)} daily allowance`}{" "}
              · {plan.payday}
            </p>
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Spendable account balances" value={plan.cash} />
        <Stat
          label="Unpaid commitments before payday"
          value={plan.due}
          hint="Includes overdue bills, loan instalments and SIP plans"
        />
        <Stat
          label="Protected money within these accounts"
          value={plan.reserved}
        />
      </section>
      <Notice>
        This allowance uses recorded account balances and commitments. Expected
        salary is not included until credited. Protected cash should exclude
        money already held in accounts you marked non-spendable. Reconcile
        balances with your bank.
      </Notice>
      <div className="flex flex-wrap items-end gap-4">
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
        <p className="pb-2 text-sm">
          {from} to {to}
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Income received" value={flow.income} />
        <Stat label="Expenses paid" value={flow.expenses} />
        <Stat label="Loan payments made" value={flow.loanPayments} />
        <Stat label="Investment contributions" value={flow.investments} />
        <Stat
          label="Recorded cash-flow surplus"
          value={flow.surplus}
          hint="Excludes transfers; this is not your bank balance"
        />
      </section>
      <DashboardInsights
        data={data}
        month={period === "cycle" ? today.slice(0, 7) : month || localMonth()}
        today={today}
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="app-card p-5">
          <h2 className="mb-4 text-xl font-semibold">Where spending went</h2>
          <ExpenseBreakdownChart data={breakdown} />
        </section>
        <div className="space-y-5">
          <section className="app-card p-5">
            <h2 className="mb-4 text-xl font-semibold">Upcoming & overdue</h2>
            {plan.pending.length ? (
              <ul className="space-y-3">
                {plan.pending.slice(0, 6).map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between gap-3 border-b border-[var(--border)] pb-2"
                  >
                    <span>
                      {c.name}
                      <span className="block text-xs">
                        {c.date}
                        {c.date < today ? " · overdue" : ""}
                      </span>
                    </span>
                    <strong>{formatCurrency(c.amount)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No unpaid commitments recorded before payday.</Empty>
            )}
            <a href="/planner" className="mt-4 inline-block text-sm underline">
              Manage plans and record payments
            </a>
          </section>
          <section className="app-card space-y-4 p-5">
            <h2 className="text-xl font-semibold">What if I buy this?</h2>
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
              <p role="status">
                Remaining allowance:{" "}
                <strong>
                  {formatCurrency(
                    money(plan.available - Math.max(0, Number(purchase))),
                  )}
                </strong>
                {plan.available - Number(purchase) < 0
                  ? ". This would use money allocated to commitments or protected savings."
                  : "."}
              </p>
            ) : (
              <p className="text-sm">
                Preview the effect on your allowance. No transaction is created.
              </p>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
