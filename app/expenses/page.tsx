"use client";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TransactionForm } from "@/components/finance/TransactionForm";
import { TransactionList } from "@/components/finance/TransactionList";
import { Field } from "@/components/finance/UI";
import { useFinanceData } from "@/lib/use-finance-data";
import { kindLabel } from "@/lib/finance-utils";
export default function TransactionsPage() {
  const { data } = useFinanceData();
  const [month, setMonth] = useState("");
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");
  const rows = data.transactions.filter(
    (t) =>
      (!month || t.date.startsWith(month)) &&
      (!kind || t.kind === kind) &&
      `${t.note} ${t.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <AppShell
      title="Transactions"
      subtitle="Record each movement once. Transfers, investments, and loan payments update their linked balances."
    >
      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <TransactionForm />
        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Month (blank = all)">
              <input
                className="app-input"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </Field>
            <Field label="Type">
              <select
                className="app-input"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="">All types</option>
                {Object.entries(kindLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Search notes or category">
              <input
                className="app-input"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Field>
          </div>
          <TransactionList rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
