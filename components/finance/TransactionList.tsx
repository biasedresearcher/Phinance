"use client";
import { useState } from "react";
import type { Transaction } from "@/lib/types";
import { useFinanceData } from "@/lib/use-finance-data";
import { formatCurrency, kindLabel } from "@/lib/finance-utils";
import { TransactionForm } from "./TransactionForm";
import { Empty } from "./UI";
export function TransactionList({ rows }: { rows: Transaction[] }) {
  const { data, setData } = useFinanceData();
  const [editing, setEditing] = useState<Transaction>();
  const [limit, setLimit] = useState(50);
  const sorted = [...rows].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
  return (
    <div className="space-y-4">
      {editing ? (
        <TransactionForm
          key={editing.id}
          entry={editing}
          onDone={() => setEditing(undefined)}
        />
      ) : null}
      {!rows.length ? (
        <Empty>No transactions for this view yet.</Empty>
      ) : (
        <div className="app-card overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Recorded transactions</caption>
            <thead>
              <tr>
                {["Date", "Details", "Account", "Amount", "Actions"].map(
                  (t) => (
                    <th className="p-2" key={t} scope="col">
                      {t}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, limit).map((t) => (
                <tr key={t.id} className="border-t border-[var(--border)]">
                  <td className="whitespace-nowrap p-2">{t.date}</td>
                  <td className="min-w-36 p-2">
                    <strong>{t.category}</strong>
                    <span className="block text-xs text-[var(--muted-foreground)]">
                      {kindLabel[t.kind]}
                      {t.salaryMonth ? ` · salary for ${t.salaryMonth}` : ""}
                    </span>
                    <span>{t.note}</span>
                  </td>
                  <td className="p-2">
                    {data.accounts.find((a) => a.id === t.accountId)?.name ??
                      "Needs account"}
                    {t.toAccountId
                      ? ` → ${data.accounts.find((a) => a.id === t.toAccountId)?.name}`
                      : ""}
                  </td>
                  <td className="whitespace-nowrap p-2 font-medium">
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-label={`Edit ${t.category} ${t.amount} on ${t.date}`}
                        className="app-button-secondary"
                        onClick={() => setEditing(t)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${t.category} ${t.amount} on ${t.date}`}
                        className="app-button-danger"
                        onClick={async () => {
                          if (
                            window.confirm(
                              "Delete this transaction? This also reverses its effect on account balances and linked payments.",
                            )
                          ) {
                            const ok = await setData((d) => ({
                              ...d,
                              transactions: d.transactions.filter(
                                (x) => x.id !== t.id,
                              ),
                            }));
                            if (ok && editing?.id === t.id)
                              setEditing(undefined);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length > limit ? (
            <button
              className="app-button-secondary mt-3"
              type="button"
              onClick={() => setLimit((n) => n + 50)}
            >
              Show 50 more
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
