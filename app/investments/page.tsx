"use client";

import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/finance-utils";
import { InvestmentEntry, InvestmentType } from "@/lib/types";
import { useFinanceData } from "@/lib/use-finance-data";
import { FormEvent, useState } from "react";

const defaultForm = {
  type: "SIP" as InvestmentType,
  amount: "",
  currentValue: "",
  date: new Date().toISOString().slice(0, 10),
};

export default function InvestmentsPage() {
  const { data, setData } = useFinanceData();
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(form.amount);
    const currentValue = Number(form.currentValue);

    if (!amount || !currentValue || !form.date) {
      return;
    }

    if (editingId) {
      setData((current) => ({
        ...current,
        investments: current.investments.map((entry) =>
          entry.id === editingId ? { ...entry, type: form.type, amount, currentValue, date: form.date } : entry,
        ),
      }));
      setEditingId(null);
      setForm(defaultForm);
      return;
    }

    const entry: InvestmentEntry = {
      id: crypto.randomUUID(),
      type: form.type,
      amount,
      currentValue,
      date: form.date,
    };

    setData((current) => ({ ...current, investments: [entry, ...current.investments] }));
    setNewEntryId(entry.id);
    setForm((current) => ({ ...current, amount: "", currentValue: "" }));
    window.setTimeout(() => setNewEntryId((id) => (id === entry.id ? null : id)), 500);
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

  const onDelete = (id: string) => {
    if (!window.confirm("Delete this investment entry?")) {
      return;
    }

    setData((current) => ({ ...current, investments: current.investments.filter((entry) => entry.id !== id) }));
    if (editingId === id) {
      setEditingId(null);
      setForm(defaultForm);
    }
  };

  return (
    <AppShell title="Investments" subtitle="Log SIP and lump-sum investments with current market value.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <form className="app-card space-y-4 p-5 lg:col-span-2" onSubmit={onSubmit}>
          <h2 className="text-xl font-semibold">{editingId ? "Edit Investment" : "Add Investment"}</h2>
          <select
            className="app-input"
            value={form.type}
            onChange={(e) => setForm((s) => ({ ...s, type: e.target.value as InvestmentType }))}
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
            onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
          />
          <input
            className="app-input"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Current value"
            value={form.currentValue}
            onChange={(e) => setForm((s) => ({ ...s, currentValue: e.target.value }))}
          />
          <input
            className="app-input"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
          />
          <button className="app-button-primary" type="submit">
            {editingId ? "Update Investment" : "Add Investment"}
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

        <div className="grid grid-cols-1 gap-4 lg:col-span-3 sm:grid-cols-2">
          {data.investments.map((entry) => {
            const gain = entry.currentValue - entry.amount;
            return (
              <article className={`app-card p-5 ${newEntryId === entry.id ? "app-entry-new" : ""}`} key={entry.id}>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">{entry.type}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{entry.date}</p>
                <p className="mt-3 text-sm">Invested: {formatCurrency(entry.amount)}</p>
                <p className="text-sm">Current: {formatCurrency(entry.currentValue)}</p>
                <p
                  className={`mt-3 text-sm font-semibold ${gain >= 0 ? "text-[var(--olive-strong)]" : "text-[var(--accent-strong)]"}`}
                >
                  {gain >= 0 ? "Gain" : "Loss"}: {formatCurrency(gain)}
                </p>
                <div className="mt-4 flex gap-2">
                  <button className="app-button-secondary flex-1" type="button" onClick={() => onEdit(entry)}>
                    Edit
                  </button>
                  <button className="app-button-danger flex-1" type="button" onClick={() => onDelete(entry.id)}>
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
