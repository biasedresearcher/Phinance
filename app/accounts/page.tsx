"use client";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { Empty, Field, Notice } from "@/components/finance/UI";
import { accountBalance, formatCurrency } from "@/lib/finance-utils";
import { localDate } from "@/lib/dates";
import { useFinanceData } from "@/lib/use-finance-data";
import type { Account } from "@/lib/types";
export default function AccountsPage() {
  const { data, setData } = useFinanceData();
  const [editing, setEditing] = useState<string>();
  const blank = () => ({
    name: "",
    kind: "bank" as Account["kind"],
    openingBalance: "0",
    openingDate: localDate(),
    spendable: true,
  });
  const [form, setForm] = useState(blank);
  const [assign, setAssign] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const record: Account = {
      ...form,
      id: editing ?? crypto.randomUUID(),
      openingBalance: Number(form.openingBalance),
    };
    if (
      await setData((d) => ({
        ...d,
        accounts: editing
          ? d.accounts.map((a) => (a.id === editing ? record : a))
          : [...d.accounts, record],
      }))
    ) {
      setEditing(undefined);
      setForm(blank());
    }
  };
  const unassigned = data.transactions.filter((t) => !t.accountId).length;
  return (
    <AppShell
      title="Accounts"
      subtitle="Start with a balance before the transactions you plan to record. Transfers move money between accounts without becoming expenses."
    >
      <Notice>
        Opening balance means the balance at the start of the opening date,
        before that day’s recorded payments. Earlier transactions remain in your
        history but do not change this balance. Only mark accounts you want
        included in everyday spending as spendable.
      </Notice>
      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <form className="app-card space-y-4 p-5" onSubmit={submit}>
          <h2 className="text-xl font-semibold">
            {editing ? "Edit account" : "Add account"}
          </h2>
          <Field label="Account name">
            <input
              className="app-input"
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Account type">
            <select
              className="app-input"
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kind: e.target.value as Account["kind"],
                }))
              }
            >
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
              <option value="savings">Savings</option>
            </select>
          </Field>
          <Field label="Opening balance (₹)">
            <input
              className="app-input"
              type="number"
              step="0.01"
              required
              value={form.openingBalance}
              onChange={(e) =>
                setForm((f) => ({ ...f, openingBalance: e.target.value }))
              }
            />
          </Field>
          <Field label="Opening date">
            <input
              className="app-input"
              type="date"
              max={localDate()}
              required
              value={form.openingDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, openingDate: e.target.value }))
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.spendable}
              onChange={(e) =>
                setForm((f) => ({ ...f, spendable: e.target.checked }))
              }
            />
            Include in spendable cash
          </label>
          <button className="app-button-primary" type="submit">
            {editing ? "Update account" : "Save account"}
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
          {data.accounts.length ? (
            data.accounts.map((a) => (
              <article className="app-card p-5" key={a.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{a.name}</h2>
                    <p className="text-xs">
                      {a.kind} ·{" "}
                      {a.spendable
                        ? "Spendable"
                        : "Excluded from spending allowance"}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(accountBalance(a, data.transactions))}
                  </p>
                </div>
                <p className="mt-3 text-sm">
                  Opening: {formatCurrency(a.openingBalance)} on {a.openingDate}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    className="app-button-secondary"
                    type="button"
                    onClick={() => {
                      setEditing(a.id);
                      setForm({
                        ...a,
                        openingBalance: String(a.openingBalance),
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="app-button-danger"
                    type="button"
                    disabled={data.transactions.some(
                      (t) => t.accountId === a.id || t.toAccountId === a.id,
                    )}
                    title="Move or delete linked transactions before deleting an account"
                    onClick={() => {
                      if (confirm(`Delete ${a.name}?`))
                        void setData((d) => ({
                          ...d,
                          accounts: d.accounts.filter((x) => x.id !== a.id),
                        }));
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <Empty>
              Add your salary account first. You can add cash and savings
              accounts later.
            </Empty>
          )}
          {unassigned > 0 ? (
            <form
              className="app-card space-y-3 p-5"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  confirm(
                    `Assign all ${unassigned} imported transactions without an account to the selected account?`,
                  )
                )
                  await setData((d) => ({
                    ...d,
                    transactions: d.transactions.map((t) =>
                      !t.accountId ? { ...t, accountId: assign } : t,
                    ),
                  }));
              }}
            >
              <h2 className="font-semibold">
                {unassigned} imported entries need an account
              </h2>
              <p className="text-sm">
                Assign individually in Transactions, or assign all here. Check
                the account’s opening date and balance first.
              </p>
              <Field label="Account for unassigned entries">
                <select
                  className="app-input"
                  required
                  value={assign}
                  onChange={(e) => setAssign(e.target.value)}
                >
                  <option value="">Choose account</option>
                  {data.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <button className="app-button-secondary" type="submit">
                Assign imported entries
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
