"use client";

import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/finance-utils";
import { SalaryEntry } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { FormEvent, useEffect, useState } from "react";

const defaultForm = {
  month: new Date().toISOString().slice(0, 7),
  amount: "",
  creditedOn: new Date().toISOString().slice(0, 10),
};

export default function SalaryPage() {
  const [salary, setSalary] = useState<SalaryEntry[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSalary = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in before viewing salary entries.");
      setLoading(false);
      return;
    }

    const { data, error: salaryError } = await supabase
      .from("salary")
      .select("id, user_id, month, amount, credited_on")
      .eq("user_id", user.id)
      .order("month", { ascending: false });

    if (salaryError) {
      setError(salaryError.message);
      setLoading(false);
      return;
    }

    const convertedSalary: SalaryEntry[] = (data ?? []).map((entry) => ({
      id: entry.id,
      month: entry.month,
      amount: Number(entry.amount),
      creditedOn: entry.credited_on,
    }));

    setSalary(convertedSalary);
    setLoading(false);
  };

  useEffect(() => {
    loadSalary();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!amount || !form.month || !form.creditedOn) {
      return;
    }

    setSaving(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in before saving a salary entry.");
      setSaving(false);
      return;
    }

    if (editingId) {
      const { error: updateError } = await supabase
        .from("salary")
        .update({
          month: form.month,
          amount,
          credited_on: form.creditedOn,
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
      await loadSalary();
      setSaving(false);
      return;
    }

    const { data: savedSalary, error: insertError } = await supabase
      .from("salary")
      .insert({
        user_id: user.id,
        month: form.month,
        amount,
        credited_on: form.creditedOn,
      })
      .select("id, user_id, month, amount, credited_on")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const savedEntry: SalaryEntry = {
      id: savedSalary.id,
      month: savedSalary.month,
      amount: Number(savedSalary.amount),
      creditedOn: savedSalary.credited_on,
    };

    setSalary((current) => [savedEntry, ...current]);
    setNewEntryId(savedEntry.id);
    setForm((current) => ({
      ...current,
      amount: "",
    }));

    window.setTimeout(() => {
      setNewEntryId((id) => (id === savedEntry.id ? null : id));
    }, 500);

    setSaving(false);
  };

  const onEdit = (entry: SalaryEntry) => {
    setEditingId(entry.id);
    setForm({
      month: entry.month,
      amount: String(entry.amount),
      creditedOn: entry.creditedOn,
    });
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this salary entry?")) {
      return;
    }

    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in before deleting a salary entry.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("salary")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSalary((current) => current.filter((entry) => entry.id !== id));

    if (editingId === id) {
      setEditingId(null);
      setForm(defaultForm);
    }
  };

  return (
    <AppShell
      title="Salary"
      subtitle="Add, review, and manage monthly salary entries."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <form
          className="app-card space-y-4 p-5 lg:col-span-2"
          onSubmit={onSubmit}
        >
          <h2 className="text-xl font-semibold">
            {editingId ? "Edit Salary" : "Add Salary"}
          </h2>

          <input
            className="app-input"
            type="month"
            required
            value={form.month}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                month: event.target.value,
              }))
            }
          />

          <input
            className="app-input"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Amount"
            value={form.amount}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                amount: event.target.value,
              }))
            }
          />

          <input
            className="app-input"
            type="date"
            required
            value={form.creditedOn}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                creditedOn: event.target.value,
              }))
            }
          />

          <button
            className="app-button-primary"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Salary"
                : "Add Salary"}
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
          <h2 className="mb-4 text-xl font-semibold">Salary Entries</h2>

          {loading ? <p>Loading salary entries...</p> : null}

          {!loading && salary.length === 0 ? (
            <p>No salary entries saved yet.</p>
          ) : null}

          {!loading && salary.length > 0 ? (
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
                {salary.map((entry) => (
                  <tr
                    className={`border-t border-[var(--border)]/80 ${
                      newEntryId === entry.id ? "app-entry-new" : ""
                    }`}
                    key={entry.id}
                  >
                    <td className="py-3">{entry.month}</td>
                    <td className="py-3">{entry.creditedOn}</td>
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
