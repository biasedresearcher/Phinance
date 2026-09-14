"use client";

import { AppShell } from "@/components/AppShell";
import {
  formatCurrency,
  getRemainingInstallments,
} from "@/lib/finance-utils";
import { EmiEntry } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { FormEvent, useEffect, useState } from "react";

const defaultForm = {
  amount: "",
  monthlyInstallment: "",
  interestRate: "",
  startDate: new Date().toISOString().slice(0, 10),
};

type EmiDatabaseRow = {
  id: string;
  user_id: string;
  amount: number | string;
  monthly_installment: number | string;
  interest_rate: number | string | null;
  start_date: string;
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
      .select(
        "id, user_id, amount, monthly_installment, interest_rate, start_date",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (emisError) {
      setError(emisError.message);
      setLoading(false);
      return;
    }

    const convertedEmis: EmiEntry[] = (
      (data ?? []) as EmiDatabaseRow[]
    ).map((entry) => ({
      id: entry.id,
      amount: Number(entry.amount),
      monthlyInstallment: Number(entry.monthly_installment),
      interestRate: Number(entry.interest_rate ?? 0),
      startDate: entry.start_date,
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

    if (!amount || !monthlyInstallment || !form.startDate) {
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
          start_date: form.startDate,
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
        start_date: form.startDate,
      })
      .select(
        "id, user_id, amount, monthly_installment, interest_rate, start_date",
      )
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const savedRow = savedEmi as EmiDatabaseRow;

    const savedEntry: EmiEntry = {
      id: savedRow.id,
      amount: Number(savedRow.amount),
      monthlyInstallment: Number(savedRow.monthly_installment),
      interestRate: Number(savedRow.interest_rate ?? 0),
      startDate: savedRow.start_date,
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
    <AppShell
      title="EMI Tracker"
      subtitle="Track loans and automatically estimate remaining instalments."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <form
          className="app-card space-y-4 p-5 lg:col-span-2"
          onSubmit={onSubmit}
        >
          <h2 className="text-xl font-semibold">
            {editingId ? "Edit EMI" : "Add EMI"}
          </h2>

          <input
            className="app-input"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Loan amount"
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

          <button
            className="app-button-primary"
            type="submit"
            disabled={saving}
          >
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

          {!loading
