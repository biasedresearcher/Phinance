"use client";

import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/finance-utils";
import { expenseCategories } from "@/lib/mock-data";
import { ExpenseEntry } from "@/lib/types";
import { useFinanceData } from "@/lib/use-finance-data";
import { FormEvent, useState } from "react";

const defaultForm = {
  amount: "",
  category: expenseCategories[0],
  date: new Date().toISOString().slice(0, 10),
  note: "",
};

export default function ExpensesPage() {
  const { data, setData } = useFinanceData();
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!amount || !form.date) {
      return;
    }

    if (editingId) {
      setData((current) => ({
        ...current,
        expenses: current.expenses.map((entry) =>
          entry.id === editingId ? { ...entry, amount, category: form.category, date: form.date, note: form.note } : entry,
        ),
      }));
      setEditingId(null);
      setForm(defaultForm);
      return;
    }

    const entry: ExpenseEntry = {
      id: crypto.randomUUID(),
      amount,
      category: form.category,
      date: form.date,
      note: form.note,
    };

    setData((current) => ({ ...current, expenses: [entry, ...current.expenses] }));
    setNewEntryId(entry.id);
    setForm((current) => ({ ...current, amount: "", note: "" }));
    window.setTimeout(() => setNewEntryId((id) => (id === entry.id ? null : id)), 500);
  };

  const onEdit = (entry: ExpenseEntry) => {
    setEditingId(entry.id);
    setForm({
      amount: String(entry.amount),
      category: entry.category,
      date: entry.date,
      note: entry.note,
    });
  };

  const onDelete = (id: string) => {
    if (!window.confirm("Delete this expense entry?")) {
      return;
    }

    setData((current) => ({ ...current, expenses: current.expenses.filter((entry) => entry.id !== id) }));
    if (editingId === id) {
      setEditingId(null);
      setForm(defaultForm);
    }
  };

  return (
    <AppShell title="Expense Logging" subtitle="Add and review expenses with category, date and notes.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <form className="app-card space-y-4 p-5 lg:col-span-2" onSubmit={onSubmit}>
          <h2 className="text-xl font-semibold">{editingId ? "Edit Expense" : "New Expense"}</h2>
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
          <button className="app-button-primary" type="submit">
            {editingId ? "Update Expense" : "Log Expense"}
          </button>
          {editingId ? (
            <button
              className="app-button-secondary"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(defaultForm);
              }}
            >
              Cancel Edit
            </button>
          ) : null}
        </form>

        <div className="app-card overflow-auto p-5 lg:col-span-3">
          <h2 className="mb-4 text-xl font-semibold">Expense Entries</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--muted-foreground)]">
              <tr>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Note</th>
                <th className="pb-3 text-right font-medium">Amount</th>
                <th className="pb-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.expenses.map((entry) => (
                <tr key={entry.id} className={`border-t border-[var(--border)]/80 ${newEntryId === entry.id ? "app-entry-new" : ""}`}>
                  <td className="py-3">{entry.date}</td>
                  <td className="py-3">{entry.category}</td>
                  <td className="py-3 text-[var(--muted-foreground)]">{entry.note || "-"}</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(entry.amount)}</td>
                  <td className="py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button className="app-button-secondary px-3 py-1.5" type="button" onClick={() => onEdit(entry)}>
                        Edit
                      </button>
                      <button className="app-button-danger px-3 py-1.5" type="button" onClick={() => onDelete(entry.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
