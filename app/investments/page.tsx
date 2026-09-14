"use client";

import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/finance-utils";
import { getFinanceRepository } from "@/lib/finance-repository";
import { InvestmentEntry, InvestmentType } from "@/lib/types";
import { FormEvent, useState } from "react";

export default function InvestmentsPage() {
  const repository = getFinanceRepository();
  const [investments, setInvestments] = useState(repository.listInvestments());
  const [form, setForm] = useState({
    type: "SIP" as InvestmentType,
    amount: "",
    currentValue: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const entry: InvestmentEntry = {
      id: crypto.randomUUID(),
      type: form.type,
      amount: Number(form.amount),
      currentValue: Number(form.currentValue),
      date: form.date,
    };

    if (!entry.amount || !entry.currentValue || !entry.date) {
      return;
    }

    setInvestments((current) => [entry, ...current]);
    setForm((current) => ({ ...current, amount: "", currentValue: "" }));
  };

  return (
    <AppShell title="Investments" subtitle="Log SIP and lump-sum investments with current market value.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <form
          className="app-card space-y-4 p-5 lg:col-span-2"
          onSubmit={onSubmit}
        >
          <h2 className="text-xl font-semibold">Add Investment</h2>
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
          <button
            className="app-button-primary"
            type="submit"
          >
            Add Investment
          </button>
        </form>

        <div className="grid grid-cols-1 gap-4 lg:col-span-3 sm:grid-cols-2">
          {investments.map((entry) => {
            const gain = entry.currentValue - entry.amount;
            return (
              <article className="app-card p-5" key={entry.id}>
                <p className="text-sm font-medium text-slate-500">{entry.type}</p>
                <p className="text-xs text-slate-400">{entry.date}</p>
                <p className="mt-3 text-sm">Invested: {formatCurrency(entry.amount)}</p>
                <p className="text-sm">Current: {formatCurrency(entry.currentValue)}</p>
                <p className={`mt-3 text-sm font-semibold ${gain >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {gain >= 0 ? "Gain" : "Loss"}: {formatCurrency(gain)}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
