"use client";

import { useEffect, useState } from "react";
import { FinanceData } from "@/lib/finance-repository";
import Dashboard from "@/components/dashboard";
import { EmiEntry, ExpenseEntry, InvestmentEntry, SalaryEntry } from "@/lib/types";

type FinanceState = {
  expenses: ExpenseEntry[];
  emi: EmiEntry[];
  investments: InvestmentEntry[];
  salary: SalaryEntry[];
};

async function fetchFinance(): Promise<FinanceState> {
  const res = await fetch("/api/finance", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch finance data");
  }
  return res.json();
}

async function mutateFinance(
  method: "POST" | "PUT" | "DELETE",
  type: "expenses" | "emi" | "investments" | "salary",
  body?: unknown,
  id?: string,
) {
  const url = new URL(`/api/finance/${type}`, location.origin);
  if (id) {
    url.searchParams.set("id", id);
  }

  const res = await fetch(url.toString(), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Failed to ${method} ${type}`);
  }

  if (method === "DELETE") {
    return;
  }
  return res.json();
}

export default function Home() {
  const [data, setData] = useState<FinanceState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFinance()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = async () => {
    setError(null);
    try {
      const d = await fetchFinance();
      setData(d);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const addExpense = async (entry: Omit<ExpenseEntry, "id">) => {
    const created = await mutateFinance("POST", "expenses", entry);
    if (!created) return;
    setData((prev) =>
      prev ? { ...prev, expenses: [created, ...prev.expenses] } : prev,
    );
  };

  const updateExpense = async (id: string, entry: Omit<ExpenseEntry, "id">) => {
    const updated = await mutateFinance("PUT", "expenses", entry, id);
    if (!updated) return;
    setData((prev) =>
      prev
        ? {
            ...prev,
            expenses: prev.expenses.map((e) => (e.id === id ? updated : e)),
          }
        : prev,
    );
  };

  const deleteExpense = async (id: string) => {
    await mutateFinance("DELETE", "expenses", undefined, id);
    setData((prev) =>
      prev ? { ...prev, expenses: prev.expenses.filter((e) => e.id !== id) } : prev,
    );
  };

  const addEmi = async (entry: Omit<EmiEntry, "id">) => {
    const created = await mutateFinance("POST", "emi", entry);
    if (!created) return;
    setData((prev) => (prev ? { ...prev, emi: [created, ...prev.emi] } : prev));
  };

  const updateEmi = async (id: string, entry: Omit<EmiEntry, "id">) => {
    const updated = await mutateFinance("PUT", "emi", entry, id);
    if (!updated) return;
    setData((prev) =>
      prev ? { ...prev, emi: prev.emi.map((e) => (e.id === id ? updated : e)) } : prev,
    );
  };

  const deleteEmi = async (id: string) => {
    await mutateFinance("DELETE", "emi", undefined, id);
    setData((prev) => (prev ? { ...prev, emi: prev.emi.filter((e) => e.id !== id) } : prev));
  };

  const addInvestment = async (entry: Omit<InvestmentEntry, "id">) => {
    const created = await mutateFinance("POST", "investments", entry);
    if (!created) return;
    setData((prev) =>
      prev ? { ...prev, investments: [created, ...prev.investments] } : prev,
    );
  };

  const updateInvestment = async (id: string, entry: Omit<InvestmentEntry, "id">) => {
    const updated = await mutateFinance("PUT", "investments", entry, id);
    if (!updated) return;
    setData((prev) =>
      prev
        ? {
            ...prev,
            investments: prev.investments.map((i) => (i.id === id ? updated : i)),
          }
        : prev,
    );
  };

  const deleteInvestment = async (id: string) => {
    await mutateFinance("DELETE", "investments", undefined, id);
    setData((prev) =>
      prev
        ? { ...prev, investments: prev.investments.filter((i) => i.id !== id) }
        : prev,
    );
  };

  const addSalary = async (entry: Omit<SalaryEntry, "id">) => {
    const created = await mutateFinance("POST", "salary", entry);
    if (!created) return;
    setData((prev) => (prev ? { ...prev, salary: [created, ...prev.salary] } : prev));
  };

  const updateSalary = async (id: string, entry: Omit<SalaryEntry, "id">) => {
    const updated = await mutateFinance("PUT", "salary", entry, id);
    if (!updated) return;
    setData((prev) =>
      prev ? { ...prev, salary: prev.salary.map((s) => (s.id === id ? updated : s)) } : prev,
    );
  };

  const deleteSalary = async (id: string) => {
    await mutateFinance("DELETE", "salary", undefined, id);
    setData((prev) =>
      prev ? { ...prev, salary: prev.salary.filter((s) => s.id !== id) } : prev,
    );
  };

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-4">Phinance</h1>
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button
          onClick={reload}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Retry
        </button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-4">Phinance</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <Dashboard
      expenses={data.expenses}
      emi={data.emi}
      investments={data.investments}
      salary={data.salary}
      addExpense={addExpense}
      updateExpense={updateExpense}
      deleteExpense={deleteExpense}
      addEmi={addEmi}
      updateEmi={updateEmi}
      deleteEmi={deleteEmi}
      addInvestment={addInvestment}
      updateInvestment={updateInvestment}
      deleteInvestment={deleteInvestment}
      addSalary={addSalary}
      updateSalary={updateSalary}
      deleteSalary={deleteSalary}
    />
  );
}
