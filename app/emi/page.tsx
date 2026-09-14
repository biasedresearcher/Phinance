"use client";

import { AppShell } from "@/components/AppShell";
import { formatCurrency, getRemainingInstallments } from "@/lib/finance-utils";
import { EmiEntry } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { FormEvent, useEffect, useState } from "react";

const defaultForm = {
  amount: "",
  monthlyInstallment: "",
  interestRate: "",
  startDate: new Date().toISOString().slice(0, 10),
};

export default function EmiPage() {
  const [emis, setEmis] = useState<EmiEntry[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmis = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in before viewing EMI entries.");
      setLoading(false);
      return;
    }

    const { data, error: emisError } = await supabase
      .from("emi")
      .select("id, user_id, amount, monthly_installment, interest_rate")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (emisError) {
      setError(emisError.message);
      setLoading(false);
      return;
    }

    const convertedEmis: EmiEntry[] = (data ?? []).map((entry) => ({
      id: entry.id,
      amount: Number(entry.amount),
      monthlyInstallment: Number(entry.monthly_installment),
      interestRate: Number(entry.interest_rate ?? 0),
      startDate: defaultForm.startDate,
    }));

    setEmis(convertedEmis);
    setLoading(false);
  };

  useEffect(() => {
    loadEmis();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(form.amount);
    const monthlyInstallment = Number(form.monthlyInstallment);
    const interestRate = Number(form.interestRate);

    if (!amount || !monthlyInstallment) {
      return;
    }

    setSaving(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in before saving an EMI entry.");
      setSaving(false);
      return;
    }

    if (editingId) {
      const { error: updateError } = await supabase
        .from("emi")
        .update({
          amount,
          monthly_installment: monthlyInstallment,
          interest_rate: interestRate,
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
      await loadEmis();
      setSaving(false);
      return;
    }

    const { data: savedEmi, error: insertError } = await supabase
      .from("emi")
      .insert({
        user_id: user.id,
        amount,
        monthly_installment: monthlyInstallment,
        interest_rate: interestRate,
      })
      .select("id, user_id, amount, monthly_installment, interest_rate")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const savedEntry: EmiEntry = {
      id: savedEmi.id,
      amount: Number(savedEmi.amount),
      monthlyInstallment: Number(savedEmi.monthly_installment),
      interestRate: Number(savedEmi.interest_rate ?? 0),
      startDate: form.startDate,
    };

    setEmis((current) => [savedEntry, ...current]);
    setNewEntryId(savedEntry.id);
    setForm((current) => ({
      ...current,
      amount: "",
      monthlyInstallment: "",
      interestRate: "",
    }));

    window.setTimeout(() => {
      setNewEntryId((id) => (id === savedEntry.id ? null : id));
    }, 500);

    setSaving(false);
  };

  const onEdit = (entry: EmiEntry) => {
    setEditingId(entry.id);
    setForm({
      amount: String(entry.amount),
      monthlyInstallment: String(entry.monthlyInstallment),
      interestRate: String(entry.interestRate),
      startDate: entry.startDate,
    });
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this EMI entry?")) {
      return;
    }

    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in before deleting an EMI entry.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("emi")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setEmis((current) => current.filter((entry) => entry.id !== id));

    if (editingId === id) {
      setEditingId(null);
      setForm(defaultForm);
    }
  };

  return (
    <AppShell title="EMI Tracker" subtitle="Track loans and automatically estimate remaining instalments.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <form className="app-card space-y-4 p-5 lg:col-span-2" onSubmit={onSubmit}>
          <h2 className="text-xl font-semibold">{editingId ? "Edit EMI" : "Add EMI"}</h2>

          <input
            className="app-input"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Loan amount"
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
          />

          <input
            className="app-input"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Monthly instalment"
            value={form.monthlyInstallment}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                monthlyInstallment: event.target.value,
              }))
            }
          />

          <input
            className="app-input"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Interest rate (%)"
            value={form.interestRate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                interestRate: event.target.value,
              }))
            }
          />

          <input
            className="app-input"
            type="date"
            required
            value={form.startDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                startDate: event.target.value,
              }))
            }
          />

          <button className="app-button-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update EMI" : "Add EMI"}
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
          <h2 className="mb-4 text-xl font-semibold">EMI Entries</h2>

          {loading ? <p>Loading EMI entries...</p> : null}

          {!loading && emis.length === 0 ? <p>No EMI entries saved yet.</p> : null}

          {!loading && emis.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="text-[var(--muted-foreground)]">
                <tr>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Monthly</th>
                  <th className="pb-3 font-medium">Interest</th>
                  <th className="pb-3 font-medium">Start</th>
                  <th className="pb-3 text-right font-medium">Remaining</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {emis.map((emi) => (
                  <tr
                    key={emi.id}
                    className={`border-t border-[var(--border)]/80 ${
                      newEntryId === emi.id ? "app-entry-new" : ""
                    }`}
                  >
                    <td className="py-3">{formatCurrency(emi.amount)}</td>
                    <td className="py-3">{formatCurrency(emi.monthlyInstallment)}</td>
                    <td className="py-3">{emi.interestRate}%</td>
                    <td className="py-3">{emi.startDate}</td>
                    <td className="py-3 text-right font-medium">
                      {getRemainingInstallments(emi)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          className="app-button-secondary px-3 py-1.5"
                          type="button"
                          onClick={() => onEdit(emi)}
                        >
                          Edit
                        </button>

                        <button
                          className="app-button-danger px-3 py-1.5"
                          type="button"
                          onClick={() => onDelete(emi.id)}
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
