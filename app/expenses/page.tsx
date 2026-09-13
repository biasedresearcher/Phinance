"use client";

import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/finance-utils";
import { getFinanceRepository } from "@/lib/finance-repository";
import { expenseCategories } from "@/lib/mock-data";
import { ExpenseEntry } from "@/lib/types";
import { FormEvent, useState } from "react";

export default function ExpensesPage() {
  const repository = getFinanceRepository();
  const [expenses, setExpenses] = useState(repository.listExpenses());
  const [form, setForm] = useState({
    amount: "",
    category: expenseCategories[0],
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const entry: ExpenseEntry = {
      id: crypto.randomUUID(),
      amount: Number(form.amount),
      category: form.category,
      date: form.date,
      note: form.note,
    };

    if (!entry.amount || !entry.date) {
      return;
    }

    setExpenses((current) => [entry, ...current]);
    setForm((current) => ({ ...current, amount: "", note: "" }));
  };

  return (
    <AppShell title="Expense Logging" subtitle="Add and review expenses with category, date and notes.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <form
          className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-2"
          onSubmit={onSubmit}
        >
          <h2 className="text-lg font-semibold">New Expense</h2>
          <input
            className="w-full rounded-lg border border-slate-300 p-2"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
          />
          <select
            className="w-full rounded-lg border border-slate-300 p-2"
            value={form.category}
            onChange={(e) => setForm((s) => ({ ...s, category: e.target.value as ExpenseEntry["category"] }))}
          >
            {expenseCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border border-slate-300 p-2"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
          />
          <textarea
            className="w-full rounded-lg border border-slate-300 p-2"
            placeholder="Note"
            rows={3}
            value={form.note}
            onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
          />
          <button
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
            type="submit"
          >
            Log Expense
          </button>
        </form>

        <div className="overflow-auto rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-3">
          <h2 className="mb-3 text-lg font-semibold">Expense Entries</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2">Date</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Note</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-200">
                  <td className="py-2">{entry.date}</td>
                  <td className="py-2">{entry.category}</td>
                  <td className="py-2">{entry.note || "-"}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(entry.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
