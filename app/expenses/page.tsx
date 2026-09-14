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
          className="app-card space-y-4 p-5 lg:col-span-2"
          onSubmit={onSubmit}
        >
          <h2 className="text-xl font-semibold">New Expense</h2>
          <input
            className="app-input"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
          />
          <select
            className="app-input"
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
            className="app-input"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
          />
          <textarea
            className="app-input"
            placeholder="Note"
            rows={3}
            value={form.note}
            onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
          />
          <button
            className="app-button-primary"
            type="submit"
          >
            Log Expense
          </button>
        </form>

        <div className="app-card overflow-auto p-5 lg:col-span-3">
          <h2 className="mb-4 text-xl font-semibold">Expense Entries</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Note</th>
                <th className="pb-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-200/80">
                  <td className="py-3">{entry.date}</td>
                  <td className="py-3">{entry.category}</td>
                  <td className="py-3 text-slate-600">{entry.note || "-"}</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(entry.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
