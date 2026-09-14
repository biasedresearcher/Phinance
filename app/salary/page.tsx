"use client";

import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/finance-utils";
import { SalaryEntry } from "@/lib/types";
import { useFinanceData } from "@/lib/use-finance-data";
import { FormEvent, useState } from "react";

const defaultForm = {
  month: new Date().toISOString().slice(0, 7),
  amount: "",
  creditedOn: new Date().toISOString().slice(0, 10),
};

export default function SalaryPage() {
  const { data, setData } = useFinanceData();
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!amount || !form.month || !form.creditedOn) {
      return;
    }

    if (editingId) {
      setData((current) => ({
        ...current,
        salary: current.salary.map((entry) =>
          entry.id === editingId ? { ...entry, month: form.month, amount, creditedOn: form.creditedOn } : entry,
        ),
      }));
      setEditingId(null);
      setForm(defaultForm);
      return;
    }

    const entry: SalaryEntry = {
      id: crypto.randomUUID(),
      month: form.month,
      amount,
      creditedOn: form.creditedOn,
    };

    setData((current) => ({ ...current, salary: [entry, ...current.salary] }));
    setNewEntryId(entry.id);
    setForm((current) => ({ ...current, amount: "" }));
    window.setTimeout(() => setNewEntryId((id) => (id === entry.id ? null : id)), 500);
  };

  const onEdit = (entry: SalaryEntry) => {
    setEditingId(entry.id);
    setForm({
      month: entry.month,
      amount: String(entry.amount),
      creditedOn: entry.creditedOn,
    });
  };

  const onDelete = (id: string) => {
    if (!window.confirm("Delete this salary entry?")) {
      return;
    }

    setData((current) => ({ ...current, salary: current.salary.filter((entry) => entry.id !== id) }));
    if (editingId === id) {
      setEditingId(null);
      setForm(defaultForm);
    }
  };

  return (
    <AppShell title="Salary" subtitle="Add, review, and manage monthly salary entries.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <form className="app-card space-y-4 p-5 lg:col-span-2" onSubmit={onSubmit}>
          <h2 className="text-xl font-semibold">{editingId ? "Edit Salary" : "Add Salary"}</h2>
          <input
            className="app-input"
            type="month"
            required
            value={form.month}
            onChange={(e) => setForm((s) => ({ ...s, month: e.target.value }))}
          />
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
          <input
            className="app-input"
            type="date"
            required
            value={form.creditedOn}
            onChange={(e) => setForm((s) => ({ ...s, creditedOn: e.target.value }))}
          />
          <button className="app-button-primary" type="submit">
            {editingId ? "Update Salary" : "Add Salary"}
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
          <h2 className="mb-4 text-xl font-semibold">Salary Entries</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--muted-foreground)]">
              <tr>
                <th className="pb-3 font-medium">Month</th>
                <th className="pb-3 font-medium">Credited On</th>
                <th className="pb-3 text-right font-medium">Amount</th>
                <th className="pb-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.salary.map((entry) => (
                <tr
                  className={`border-t border-[var(--border)]/80 ${newEntryId === entry.id ? "app-entry-new" : ""}`}
                  key={entry.id}
                >
                  <td className="py-3">{entry.month}</td>
                  <td className="py-3">{entry.creditedOn}</td>
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
