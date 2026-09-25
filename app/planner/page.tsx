"use client";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { Field, Notice, Empty } from "@/components/finance/UI";
import { TransactionForm } from "@/components/finance/TransactionForm";
import { useFinanceData } from "@/lib/use-finance-data";
import {
  commitments,
  formatCurrency,
  sumMoney,
  money,
} from "@/lib/finance-utils";
import { localDate, localMonth, monthDate } from "@/lib/dates";
import type { Bill, Commitment, FinanceData } from "@/lib/types";
function PaydayForm() {
  const { data, setData } = useFinanceData();
  const [payday, setPayday] = useState(String(data.settings.payday));
  const [salary, setSalary] = useState(String(data.settings.expectedSalary));
  const [reserve, setReserve] = useState(String(data.settings.protectedCash));
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="app-card space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaved(
          await setData((d) => ({
            ...d,
            settings: {
              ...d.settings,
              payday: Number(payday),
              expectedSalary: Number(salary),
              protectedCash: Number(reserve),
            },
          })),
        );
      }}
    >
      <h2 className="text-xl font-semibold">Your salary plan</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Usual payday"
          hint="For short months, the last day is used."
        >
          <input
            className="app-input"
            required
            type="number"
            min="1"
            max="31"
            value={payday}
            onChange={(e) => {
              setPayday(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <Field
          label="Expected net salary (₹)"
          hint="A planning reference, not money received."
        >
          <input
            className="app-input"
            required
            type="number"
            min="0"
            step="0.01"
            value={salary}
            onChange={(e) => {
              setSalary(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <Field
          label="Protected cash (₹)"
          hint="Only money still inside spendable accounts."
        >
          <input
            className="app-input"
            required
            type="number"
            min="0"
            step="0.01"
            value={reserve}
            onChange={(e) => {
              setReserve(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
      </div>
      <button className="app-button-secondary" type="submit">
        Save salary plan
      </button>
      {saved ? (
        <span role="status" className="ml-3 text-sm">
          Saved.
        </span>
      ) : null}
    </form>
  );
}
function BudgetForm({ data, month }: { data: FinanceData; month: string }) {
  const { setData } = useFinanceData();
  const [category, setCategory] = useState(data.categories[0]);
  const [amount, setAmount] = useState("");
  return (
    <form
      className="grid items-end gap-3 sm:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await setData((d) => {
            const existing = d.budgets.find(
              (b) => b.month === month && b.category === category,
            );
            return {
              ...d,
              budgets: [
                ...d.budgets.filter((b) => b.id !== existing?.id),
                {
                  id: existing?.id ?? crypto.randomUUID(),
                  month,
                  category,
                  amount: Number(amount),
                },
              ],
            };
          })
        )
          setAmount("");
      }}
    >
      <Field label="Budget category">
        <select
          className="app-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {data.categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Monthly limit (₹)">
        <input
          className="app-input"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <button className="app-button-primary" type="submit">
        Set / update budget
      </button>
    </form>
  );
}
export default function PlannerPage() {
  const { data, setData } = useFinanceData();
  const [month, setMonth] = useState(localMonth);
  const [editing, setEditing] = useState<string>();
  const [payment, setPayment] = useState<Commitment>();
  const blank = () => ({
    name: "",
    amount: "",
    category: data.categories[0],
    dueDay: "1",
    startMonth: localMonth(),
    endMonth: "",
  });
  const [form, setForm] = useState(blank);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const bill: Bill = {
      ...form,
      id: editing ?? crypto.randomUUID(),
      amount: Number(form.amount),
      dueDay: Number(form.dueDay),
    };
    if (
      await setData((d) => ({
        ...d,
        bills: editing
          ? d.bills.map((b) => (b.id === editing ? bill : b))
          : [...d.bills, bill],
      }))
    ) {
      setEditing(undefined);
      setForm(blank());
    }
  };
  const scheduled = commitments(
    data,
    `${month || localMonth()}-01`,
    monthDate(month || localMonth(), 31),
  );
  const locked =
    !!editing && data.transactions.some((t) => t.billId === editing);
  return (
    <AppShell
      title="Plan your payday"
      subtitle="Keep expected payments separate from actual transactions. A plan changes cash only when you record a payment."
    >
      <PaydayForm />
      <div className="flex items-end gap-3">
        <Field label="Planning month">
          <input
            className="app-input"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
      </div>
      <section className="app-card space-y-4 p-5">
        <h2 className="text-xl font-semibold">Category budgets · {month}</h2>
        <BudgetForm data={data} month={month || localMonth()} />
        {data.budgets
          .filter((b) => b.month === month)
          .map((b) => {
            const spent = sumMoney(
              data.transactions
                .filter(
                  (t) =>
                    t.kind === "expense" &&
                    t.category === b.category &&
                    t.date.startsWith(month) &&
                    t.date <= localDate(),
                )
                .map((t) => t.amount),
            );
            return (
              <div key={b.id} className="border-t border-[var(--border)] pt-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{b.category}</strong>
                  <span>
                    {formatCurrency(spent)} of {formatCurrency(b.amount)} ·{" "}
                    {formatCurrency(money(b.amount - spent))} remaining
                  </span>
                  <button
                    type="button"
                    className="text-sm underline"
                    onClick={() => {
                      if (confirm(`Remove ${b.category} budget for ${month}?`))
                        void setData((d) => ({
                          ...d,
                          budgets: d.budgets.filter((x) => x.id !== b.id),
                        }));
                    }}
                  >
                    Remove
                  </button>
                </div>
                <progress
                  className="mt-2 w-full"
                  aria-label={`${b.category} budget used`}
                  max={b.amount}
                  value={Math.min(spent, b.amount)}
                />
              </div>
            );
          })}
        <p className="text-xs">
          Budgets are spending limits. They are not deducted again from the
          payday allowance.
        </p>
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <form className="app-card space-y-4 p-5" onSubmit={submit}>
          <h2 className="text-xl font-semibold">
            {editing ? "Edit recurring bill" : "Add recurring bill"}
          </h2>
          {locked ? (
            <Notice>
              This bill has recorded payments. To change its amount or schedule,
              end it and create a new bill, preserving history.
            </Notice>
          ) : null}
          <Field label="Bill name">
            <input
              className="app-input"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Bill amount (₹)">
            <input
              className="app-input"
              required
              disabled={locked}
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
            />
          </Field>
          <Field label="Bill category">
            <select
              className="app-input"
              disabled={locked}
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
            >
              {data.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Due day">
            <input
              className="app-input"
              required
              disabled={locked}
              type="number"
              min="1"
              max="31"
              value={form.dueDay}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDay: e.target.value }))
              }
            />
          </Field>
          <Field label="First month">
            <input
              className="app-input"
              required
              disabled={locked}
              type="month"
              value={form.startMonth}
              onChange={(e) =>
                setForm((f) => ({ ...f, startMonth: e.target.value }))
              }
            />
          </Field>
          <Field label="Last month (optional)">
            <input
              className="app-input"
              type="month"
              min={form.startMonth}
              value={form.endMonth}
              onChange={(e) =>
                setForm((f) => ({ ...f, endMonth: e.target.value }))
              }
            />
          </Field>
          <button className="app-button-primary" type="submit">
            {editing ? "Update bill" : "Save recurring bill"}
          </button>
          {editing ? (
            <button
              className="app-button-secondary"
              type="button"
              onClick={() => {
                setEditing(undefined);
                setForm(blank());
              }}
            >
              Cancel
            </button>
          ) : null}
        </form>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Unpaid scheduled payments · {month}
          </h2>
          {payment ? (
            <TransactionForm
              key={payment.id}
              fixedKind={
                payment.kind === "bill"
                  ? "expense"
                  : payment.kind === "loan"
                    ? "loan_payment"
                    : "investment"
              }
              defaults={{
                amount: payment.amount,
                note: payment.name,
                category: payment.category,
                occurrence: payment.date,
                ...(payment.kind === "bill"
                  ? { billId: payment.referenceId }
                  : payment.kind === "loan"
                    ? { loanId: payment.referenceId }
                    : { investmentId: payment.referenceId }),
              }}
              onDone={() => setPayment(undefined)}
            />
          ) : null}
          {scheduled.length ? (
            scheduled.map((c) => (
              <article
                key={c.id}
                className="app-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <strong>{c.name}</strong>
                  <p className="text-sm">
                    {c.date} · {c.kind.toUpperCase()}
                    {c.date < localDate() ? " · overdue" : ""}
                  </p>
                </div>
                <strong>{formatCurrency(c.amount)}</strong>
                <button
                  className="app-button-secondary"
                  type="button"
                  onClick={() => setPayment(c)}
                >
                  Record payment
                </button>
              </article>
            ))
          ) : (
            <Empty>No unpaid scheduled payments in this month.</Empty>
          )}
          <h2 className="pt-3 text-xl font-semibold">
            Recurring bill schedules
          </h2>
          {data.bills.map((b) => (
            <article className="app-card p-4" key={b.id}>
              <strong>{b.name}</strong>
              <p className="text-sm">
                {formatCurrency(b.amount)} · day {b.dueDay} · {b.startMonth} to{" "}
                {b.endMonth || "ongoing"}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="app-button-secondary"
                  onClick={() => {
                    setEditing(b.id);
                    setForm({
                      ...b,
                      amount: String(b.amount),
                      dueDay: String(b.dueDay),
                    });
                  }}
                >
                  Edit schedule
                </button>
                <button
                  type="button"
                  className="app-button-danger"
                  disabled={data.transactions.some((t) => t.billId === b.id)}
                  title="End a bill with linked payments instead of deleting it"
                  onClick={() => {
                    if (confirm(`Delete the schedule for ${b.name}?`))
                      void setData((d) => ({
                        ...d,
                        bills: d.bills.filter((x) => x.id !== b.id),
                      }));
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
