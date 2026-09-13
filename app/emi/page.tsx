"use client";

import { AppShell } from "@/components/AppShell";
import { formatCurrency, getRemainingInstallments } from "@/lib/finance-utils";
import { getFinanceRepository } from "@/lib/finance-repository";
import { EmiEntry } from "@/lib/types";
import { FormEvent, useState } from "react";

export default function EmiPage() {
  const repository = getFinanceRepository();
  const [emis, setEmis] = useState(repository.listEmis());
  const [form, setForm] = useState({
    amount: "",
    monthlyInstallment: "",
    interestRate: "",
    startDate: new Date().toISOString().slice(0, 10),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const entry: EmiEntry = {
      id: crypto.randomUUID(),
      amount: Number(form.amount),
      monthlyInstallment: Number(form.monthlyInstallment),
      interestRate: Number(form.interestRate),
      startDate: form.startDate,
    };

    if (!entry.amount || !entry.monthlyInstallment || !entry.startDate) {
      return;
    }

    setEmis((current) => [entry, ...current]);
    setForm((current) => ({ ...current, amount: "", monthlyInstallment: "", interestRate: "" }));
  };

  return (
    <AppShell title="EMI Tracker" subtitle="Track loans and automatically estimate remaining instalments.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <form
          className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-2"
          onSubmit={onSubmit}
        >
          <h2 className="text-lg font-semibold">Add EMI</h2>
          <input
            className="w-full rounded-lg border border-slate-300 p-2"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Loan amount"
            value={form.amount}
            onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-slate-300 p-2"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Monthly instalment"
            value={form.monthlyInstallment}
            onChange={(e) => setForm((s) => ({ ...s, monthlyInstallment: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-slate-300 p-2"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Interest rate (%)"
            value={form.interestRate}
            onChange={(e) => setForm((s) => ({ ...s, interestRate: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-slate-300 p-2"
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
          />
          <button
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
            type="submit"
          >
            Add EMI
          </button>
        </form>

        <div className="overflow-auto rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-3">
          <h2 className="mb-3 text-lg font-semibold">EMI Entries</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Monthly</th>
                <th className="pb-2">Interest</th>
                <th className="pb-2">Start</th>
                <th className="pb-2 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {emis.map((emi) => (
                <tr key={emi.id} className="border-t border-slate-200">
                  <td className="py-2">{formatCurrency(emi.amount)}</td>
                  <td className="py-2">{formatCurrency(emi.monthlyInstallment)}</td>
                  <td className="py-2">{emi.interestRate}%</td>
                  <td className="py-2">{emi.startDate}</td>
                  <td className="py-2 text-right font-medium">{getRemainingInstallments(emi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
