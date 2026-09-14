"use client";

import { AppShell } from "@/components/AppShell";
import { formatCurrency, getRemainingInstallments } from "@/lib/finance-utils";
import { EmiEntry } from "@/lib/types";
import { useFinanceData } from "@/lib/use-finance-data";
import { FormEvent, useState } from "react";

const defaultForm = {
  amount: "",
  monthlyInstallment: "",
  interestRate: "",
  startDate: new Date().toISOString().slice(0, 10),
};

export default function EmiPage() {
  const { data, setData } = useFinanceData();
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(form.amount);
    const monthlyInstallment = Number(form.monthlyInstallment);
    const interestRate = Number(form.interestRate);

    if (!amount || !monthlyInstallment || !form.startDate) {
      return;
    }

    if (editingId) {
      setData((current) => ({
        ...current,
        emi: current.emi.map((entry) =>
          entry.id === editingId ? { ...entry, amount, monthlyInstallment, interestRate, startDate: form.startDate } : entry,
        ),
      }));
      setEditingId(null);
      setForm(defaultForm);
      return;
    }

    const entry: EmiEntry = {
      id: crypto.randomUUID(),
      amount,
      monthlyInstallment,
      interestRate,
      startDate: form.startDate,
    };

    setData((current) => ({ ...current, emi: [entry, ...current.emi] }));
    setNewEntryId(entry.id);
    setForm((current) => ({ ...current, amount: "", monthlyInstallment: "", interestRate: "" }));
    window.setTimeout(() => setNewEntryId((id) => (id === entry.id ? null : id)), 500);
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

  const onDelete = (id: string) => {
    if (!window.confirm("Delete this EMI entry?")) {
      return;
    }

    setData((current) => ({ ...current, emi: current.emi.filter((entry) => entry.id !== id) }));
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
            onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
          />
          <input
            className="app-input"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Monthly instalment"
            value={form.monthlyInstallment}
            onChange={(e) => setForm((s) => ({ ...s, monthlyInstallment: e.target.value }))}
          />
          <input
            className="app-input"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Interest rate (%)"
            value={form.interestRate}
            onChange={(e) => setForm((s) => ({ ...s, interestRate: e.target.value }))}
          />
          <input
            className="app-input"
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
          />
          <button className="app-button-primary" type="submit">
            {editingId ? "Update EMI" : "Add EMI"}
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
          <h2 className="mb-4 text-xl font-semibold">EMI Entries</h2>
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
              {data.emi.map((emi) => (
                <tr key={emi.id} className={`border-t border-[var(--border)]/80 ${newEntryId === emi.id ? "app-entry-new" : ""}`}>
                  <td className="py-3">{formatCurrency(emi.amount)}</td>
                  <td className="py-3">{formatCurrency(emi.monthlyInstallment)}</td>
                  <td className="py-3">{emi.interestRate}%</td>
                  <td className="py-3">{emi.startDate}</td>
                  <td className="py-3 text-right font-medium">{getRemainingInstallments(emi)}</td>
                  <td className="py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button className="app-button-secondary px-3 py-1.5" type="button" onClick={() => onEdit(emi)}>
                        Edit
                      </button>
                      <button className="app-button-danger px-3 py-1.5" type="button" onClick={() => onDelete(emi.id)}>
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
