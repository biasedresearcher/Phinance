"use client";

import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/finance-utils";
import { InvestmentEntry, InvestmentType } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { FormEvent, useEffect, useState } from "react";

const defaultForm = {
  type: "SIP" as InvestmentType,
  amount: "",
  currentValue: "",
  date: new Date().toISOString().slice(0, 10),
};

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<InvestmentEntry[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvestments = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in before viewing investments.");
      setLoading(false);
      return;
    }

    const { data, error: investmentsError } = await supabase
      .from("investments")
      .select("id, user_id, type_amount, amount, current_value, date")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (investmentsError) {
      setError(investmentsError.message);
      setLoading(false);
      return;
    }

    const convertedInvestments: InvestmentEntry[] = (data ?? []).map((entry) => ({
      id: entry.id,
      type: entry.type_amount as InvestmentType,
      amount: Number(entry.amount),
      currentValue: Number(entry.current_value),
      date: entry.date,
    }));

    setInvestments(convertedInvestments);
    setLoading(false);
  };

  useEffect(() => {
    loadInvestments();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(form.amount);
    const currentValue = Number(form.currentValue);

    if (!amount || !currentValue || !form.date) {
      return;
    }

    setSaving(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in before saving an investment.");
      setSaving(false);
      return;
    }

    if (editingId) {
      const { error: updateError } = await supabase
        .from("investments")
        .update({
          type_amount: form.type,
          amount,
          current_value: currentValue,
          date: form.date,
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
      await loadInvestments();
      setSaving(false);
      return;
    }

    const { data: savedInvestment, error: insertError } = await supabase
      .from("investments")
      .insert({
        user_id: user.id,
        type_amount: form.type,
        amount,
        current_value: currentValue,
        date: form.date,
      })
      .select("id, user_id, type_amount, amount, current_value, date")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const savedEntry: InvestmentEntry = {
      id: savedInvestment.id,
      type: savedInvestment.type_amount as InvestmentType,
      amount: Number(savedInvestment.amount),
      currentValue: Number(savedInvestment.current_value),
      date: savedInvestment.date,
    };

    setInvestments((current) => [savedEntry, ...current]);
    setNewEntryId(savedEntry.id);
    setForm((current) => ({
      ...current,
      amount: "",
      currentValue: "",
    }));

    window.setTimeout(() => {
      setNewEntryId((id) => (id === savedEntry.id ? null : id));
    }, 500);

    setSaving(false);
  };

  const onEdit = (entry: InvestmentEntry) => {
    setEditingId(entry.id);
    setForm({
      type: entry.type,
      amount: String(entry.amount),
      currentValue: String(entry.currentValue),
      date: entry.date,
    });
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this investment entry?")) {
      return;
    }

    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in before deleting an investment.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("investments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setInvestments((current) => current.filter((entry) => entry.id !== id));

    if (editingId === id) {
      setEditingId(null);
      setForm(defaultForm);
    }
  };

  return (
    <AppShell
      title="Investments"
      subtitle="Log SIP and lump-sum investments with current market value."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <form className="app-card space-y-4 p-5 lg:col-span-2" onSubmit={onSubmit}>
          <h2 className="text-xl font-semibold">
            {editingId ? "Edit Investment" : "Add Investment"}
          </h2>

          <select
            className="app-input"
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                type: event.target.value as InvestmentType,
              }))
            }
          >
            <option value="SIP">SIP</option>
            <option value="Lump Sum">Lump Sum</option>
          </select>

          <input
            className="app-input"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Invested amount"
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
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Current value"
            value={form.currentValue}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                currentValue: event.target.value,
              }))
            }
          />

          <input
            className="app-input"
            type="date"
            required
            value={form.date}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                date: event.target.value,
              }))
            }
          />

          <button className="app-button-primary" type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : editingId
                ? "Update Investment"
                : "Add Investment"}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-3">
          {loading ? <p>Loading investments...</p> : null}

          {!loading && investments.length === 0 ? (
            <p>No investments saved yet.</p>
          ) : null}

          {!loading &&
            investments.map((entry) => {
              const gain = entry.currentValue - entry.amount;

              return (
                <article
                  className={`app-card p-5 ${
                    newEntryId === entry.id ? "app-entry-new" : ""
                  }`}
                  key={entry.id}
                >
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">
                    {entry.type}
                  </p>

                  <p className="text-xs text-[var(--muted-foreground)]">
                    {entry.date}
                  </p>

                  <p className="mt-3 text-sm">
                    Invested: {formatCurrency(entry.amount)}
                  </p>

                  <p className="text-sm">
                    Current: {formatCurrency(entry.currentValue)}
                  </p>

                  <p
                    className={`mt-3 text-sm font-semibold ${
                      gain >= 0
                        ? "text-[var(--olive-strong)]"
                        : "text-[var(--accent-strong)]"
                    }`}
                  >
                    {gain >= 0 ? "Gain" : "Loss"}: {formatCurrency(gain)}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      className="app-button-secondary flex-1"
                      type="button"
                      onClick={() => onEdit(entry)}
                    >
                      Edit
                    </button>

                    <button
                      className="app-button-danger flex-1"
                      type="button"
                      onClick={() => onDelete(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
        </div>
      </div>
    </AppShell>
  );
}
