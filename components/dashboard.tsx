"use client";

import { useState } from "react";
import { EmiEntry, ExpenseEntry, InvestmentEntry, SalaryEntry } from "@/lib/types";
import { AppShell } from "./AppShell";
import { ExpenseBreakdownChart } from "./ExpenseBreakdownChart";

type Props = {
  expenses: ExpenseEntry[];
  emi: EmiEntry[];
  investments: InvestmentEntry[];
  salary: SalaryEntry[];
  addExpense: (e: Omit<ExpenseEntry, "id">) => void;
  updateExpense: (id: string, e: Omit<ExpenseEntry, "id">) => void;
  deleteExpense: (id: string) => void;
  addEmi: (e: Omit<EmiEntry, "id">) => void;
  updateEmi: (id: string, e: Omit<EmiEntry, "id">) => void;
  deleteEmi: (id: string) => void;
  addInvestment: (e: Omit<InvestmentEntry, "id">) => void;
  updateInvestment: (id: string, e: Omit<InvestmentEntry, "id">) => void;
  deleteInvestment: (id: string) => void;
  addSalary: (e: Omit<SalaryEntry, "id">) => void;
  updateSalary: (id: string, e: Omit<SalaryEntry, "id">) => void;
  deleteSalary: (id: string) => void;
};

export default function Dashboard({
  expenses,
  emi,
  investments,
  salary,
  addExpense,
  updateExpense,
  deleteExpense,
  addEmi,
  updateEmi,
  deleteEmi,
  addInvestment,
  updateInvestment,
  deleteInvestment,
  addSalary,
  updateSalary,
  deleteSalary,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "expenses" | "emi" | "investments" | "salary"
  >("overview");

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Overview</h2>
          <ExpenseBreakdownChart expenses={expenses} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Expenses"
              value={`₹${expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}`}
            />
            <StatCard
              title="Total EMI"
              value={`₹${emi.reduce((s, e) => s + e.amount, 0).toLocaleString()}`}
            />
            <StatCard
              title="Total Investments"
              value={`₹${investments.reduce((s, i) => s + i.currentValue, 0).toLocaleString()}`}
            />
            <StatCard
              title="Monthly Salary"
              value={`₹${salary.length ? salary[0].amount.toLocaleString() : "0"}`}
            />
          </div>
        </div>
      )}

      {activeTab === "expenses" && (
        <CrudTable
          title="Expenses"
          columns={[
            { key: "date", label: "Date" },
            { key: "category", label: "Category" },
            { key: "amount", label: "Amount", isCurrency: true },
            { key: "note", label: "Note" },
          ]}
          data={expenses}
          onAdd={(row) =>
            addExpense({
              date: row.date as string,
              category: row.category as ExpenseEntry["category"],
              amount: Number(row.amount),
              note: (row.note as string) ?? "",
            })
          }
          onUpdate={(id, row) =>
            updateExpense(id, {
              date: row.date as string,
              category: row.category as ExpenseEntry["category"],
              amount: Number(row.amount),
              note: (row.note as string) ?? "",
            })
          }
          onDelete={deleteExpense}
          emptyMessage="No expenses yet."
        />
      )}

      {activeTab === "emi" && (
        <CrudTable
          title="EMI"
          columns={[
            { key: "start_date", label: "Start Date" },
            { key: "amount", label: "Principal", isCurrency: true },
            { key: "monthly_installment", label: "EMI", isCurrency: true },
            { key: "interest_rate", label: "Interest %" },
          ]}
          data={emi}
          onAdd={(row) =>
            addEmi({
              startDate: row.start_date as string,
              amount: Number(row.amount),
              monthlyInstallment: Number(row.monthly_installment),
              interestRate: Number(row.interest_rate),
            })
          }
          onUpdate={(id, row) =>
            updateEmi(id, {
              startDate: row.start_date as string,
              amount: Number(row.amount),
              monthlyInstallment: Number(row.monthly_installment),
              interestRate: Number(row.interest_rate),
            })
          }
          onDelete={deleteEmi}
          emptyMessage="No EMI entries yet."
        />
      )}

      {activeTab === "investments" && (
        <CrudTable
          title="Investments"
          columns={[
            { key: "date", label: "Date" },
            { key: "type", label: "Type" },
            { key: "amount", label: "Invested", isCurrency: true },
            { key: "current_value", label: "Current Value", isCurrency: true },
          ]}
          data={investments}
          onAdd={(row) =>
            addInvestment({
              date: row.date as string,
              type: row.type as InvestmentEntry["type"],
              amount: Number(row.amount),
              currentValue: Number(row.current_value),
            })
          }
          onUpdate={(id, row) =>
            updateInvestment(id, {
              date: row.date as string,
              type: row.type as InvestmentEntry["type"],
              amount: Number(row.amount),
              currentValue: Number(row.current_value),
            })
          }
          onDelete={deleteInvestment}
          emptyMessage="No investments yet."
        />
      )}

      {activeTab === "salary" && (
        <CrudTable
          title="Salary"
          columns={[
            { key: "month", label: "Month" },
            { key: "amount", label: "Amount", isCurrency: true },
            { key: "credited_on", label: "Credited On" },
          ]}
          data={salary}
          onAdd={(row) =>
            addSalary({
              month: row.month as string,
              amount: Number(row.amount),
              creditedOn: row.credited_on as string,
            })
          }
          onUpdate={(id, row) =>
            updateSalary(id, {
              month: row.month as string,
              amount: Number(row.amount),
              creditedOn: row.credited_on as string,
            })
          }
          onDelete={deleteSalary}
          emptyMessage="No salary entries yet."
        />
      )}
    </AppShell>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

type Column = {
  key: string;
  label: string;
  isCurrency?: boolean;
};

function CrudTable<T extends Record<string, unknown>>({
  title,
  columns,
  data,
  onAdd,
  onUpdate,
  onDelete,
  emptyMessage,
}: {
  title: string;
  columns: Column[];
  data: T[];
  onAdd: (row: Record<string, unknown>) => void;
  onUpdate: (id: string, row: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  emptyMessage: string;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const startAdd = () => {
    const initial: Record<string, unknown> = {};
    for (const c of columns) {
      initial[c.key] = c.key.includes("date") || c.key === "month"
        ? new Date().toISOString().slice(0, 10)
        : c.key.includes("rate") || c.key.includes("percent")
        ? 0
        : c.isCurrency
        ? 0
        : "";
    }
    setForm(initial);
    setIsAdding(true);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setForm({});
  };

  const submitAdd = () => {
    onAdd(form);
    setIsAdding(false);
    setForm({});
  };

  const startEdit = (item: T) => {
    setEditingId((item as any).id ?? null);
    setForm({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({});
  };

  const submitEdit = () => {
    if (!editingId) return;
    onUpdate(editingId, form);
    setEditingId(null);
    setForm({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        {!isAdding && (
          <button
            onClick={startAdd}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white"
          >
            Add
          </button>
        )}
      </div>

      {isAdding && (
        <div className="rounded border p-4 space-y-3">
          <h3 className="font-medium">Add {title.slice(0, -1)}</h3>
          {columns.map((c) => (
            <div key={c.key}>
              <label className="block text-sm mb-1">{c.label}</label>
              <input
                type={c.key.includes("date") || c.key === "month" ? "date" : c.isCurrency ? "number" : "text"}
                className="w-full rounded border px-2 py-1"
                value={(form[c.key] as string | number) ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    [c.key]: c.isCurrency ? Number(e.target.value) : e.target.value,
                  }))
                }
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button
              onClick={submitAdd}
              className="rounded bg-green-600 px-3 py-1.5 text-sm text-white"
            >
              Save
            </button>
            <button
              onClick={cancelAdd}
              className="rounded bg-gray-200 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {data.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      )}

      {data.length > 0 && (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-2 text-left font-medium">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const id = (item as any).id as string;
                const isEditing = editingId === id;

                if (isEditing) {
                  return (
                    <tr key={id} className="border-t">
                      {columns.map((c) => (
                        <td key={c.key} className="px-3 py-2">
                          <input
                            type={
                              c.key.includes("date") || c.key === "month"
                                ? "date"
                                : c.isCurrency
                                ? "number"
                                : "text"
                            }
                            className="w-full rounded border px-2 py-1"
                            value={(form[c.key] as string | number) ?? ""}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                [c.key]: c.isCurrency
                                  ? Number(e.target.value)
                                  : e.target.value,
                              }))
                            }
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={submitEdit}
                          className="mr-2 rounded bg-green-600 px-2 py-1 text-xs text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded bg-gray-200 px-2 py-1 text-xs"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={id} className="border-t">
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-2">
                        {c.isCurrency
                          ? `₹${Number(item[c.key]).toLocaleString()}`
                          : String(item[c.key] ?? "")}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => startEdit(item)}
                        className="mr-2 rounded bg-blue-600 px-2 py-1 text-xs text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(id)}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
