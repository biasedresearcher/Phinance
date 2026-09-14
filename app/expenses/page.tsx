"use client";

import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/finance-utils";
import { expenseCategories } from "@/lib/mock-data";
import { ExpenseEntry } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { FormEvent, useEffect, useState } from "react";

const defaultForm = {
  amount: "",
  category: expenseCategories[0],
  date: new Date().toISOString().slice(0, 10),
  note: "",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in before viewing expenses.");
      setLoading(false);
      return;
    }

    const { data, error: expensesError } = await supabase
      .from("expenses")
      .select("id, user_id, amount, category, date, note")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (expensesError) {
      setError(expensesError.message);
      setLoading(false);
      return;
    }

    setExpenses((data ?? []) as ExpenseEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!amount || !form.date) {
      return;
    }

    setSaving(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in before saving an expense.");
      setSaving(false);
      return;
    }

    if (editingId) {
      const { error: updateError } = await supabase
        .from("expenses")
        .update({
          amount,
          category: form.category,
          date: form.date,
          note: form.note,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId)
        .eq("user_id", user.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      setEditingId(null);
      setForm(defaultForm);
      await loadExpenses();
      setSaving(false);
      return;
    }

    const { data: savedExpense, error: insertError } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        amount,
        category: form.category,
        date: form.date,
        note: form.note,
      })
      .select("id, user_id, amount, category, date, note")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const savedEntry = savedExpense as ExpenseEntry;

    setExpenses((current) => [savedEntry, ...current]);
    setNewEntryId(savedEntry.id);
    setForm((current) => ({ ...current, amount: "", note: "" }));

    window.setTimeout(() => {
      setNewEntryId((id) => (id === savedEntry.id ? null : id));
    }, 500);

    setSaving(false);
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

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this expense entry?")) {
      return;
    }

    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in before deleting an expense.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setExpenses((current) => current.filter((entry) => entry.id !== id));

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
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
          />

          <select
            className="app-input"
            value={form.category}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                category: event.target.value as ExpenseEntry["category"],
              }))
            }
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
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />

          <textarea
            className="app-input"
            placeholder="Note"
            rows={3}
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          />

          <button className="app-button-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update Expense" : "Log Expense"}
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

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
        </form>

        <div className="app-card overflow-auto p-5 lg:col-span-3">
          <h2 className="mb-4 text-xl font-semibold">Expense Entries</h2>

          {loading ? <p>Loading expenses...</p> : null}

          {!loading && expenses.length === 0 ? <p>No expenses saved yet.</p> : null}

          {!loading && expenses.length > 0 ? (
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
                {expenses.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`border-t border-[var(--border)]/80 ${
                      newEntryId === entry.id ? "app-entry-new" : ""
                    }`}
                  >
                    <td className="py-3">{entry.date}</td>
                    <td className="py-3">{entry.category}</td>
                    <td className="py-3 text-[var(--muted-foreground)]">{entry.note || "-"}</td>
                    <td className="py-3 text-right font-medium">
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          className="app-button-secondary px-3 py-1.5"
                          type="button"
                          onClick={() => onEdit(entry)}
                        >
                          Edit
                        </button>

                        <button
                          className="app-button-danger px-3 py-1.5"
                          type="button"
                          onClick={() => onDelete(entry.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
