"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ExpenseBreakdownChart } from "@/components/ExpenseBreakdownChart";
import {
  formatCurrency,
  getCurrentMonthIncomeAndExpenses,
  getExpenseBreakdown,
} from "@/lib/finance-utils";
import { supabase } from "@/lib/supabase";
import { ExpenseEntry, SalaryEntry } from "@/lib/types";

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [salary, setSalary] = useState<SalaryEntry[]>([]);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      window.location.replace("/login");
      return;
    }

    const [expensesResult, salaryResult] = await Promise.all([
      supabase
        .from("expenses")
        .select("id, user_id, amount, category, date, note")
        .eq("user_id", user.id)
        .order("date", { ascending: false }),

      supabase
        .from("salary")
        .select("id, user_id, month, amount, credited_on")
        .eq("user_id", user.id)
        .order("month", { ascending: false }),
    ]);

    if (expensesResult.error) {
      setError(expensesResult.error.message);
      setLoading(false);
      return;
    }

    if (salaryResult.error) {
      setError(salaryResult.error.message);
      setLoading(false);
      return;
    }

    const convertedExpenses: ExpenseEntry[] = (expensesResult.data ?? []).map(
      (entry) => ({
        id: entry.id,
        amount: Number(entry.amount),
        category: entry.category as ExpenseEntry["category"],
        date: entry.date,
        note: entry.note ?? "",
      }),
    );

    const convertedSalary: SalaryEntry[] = (salaryResult.data ?? []).map(
      (entry) => ({
        id: entry.id,
        month: entry.month,
        amount: Number(entry.amount),
        creditedOn: entry.credited_on,
      }),
    );

    setExpenses(convertedExpenses);
    setSalary(convertedSalary);
    setLoading(false);
  };

  useEffect(() => {
    const checkSessionAndLoadData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.replace("/login");
        return;
      }

      setIsCheckingSession(false);
      await loadDashboardData();
    };

    void checkSessionAndLoadData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.replace("/login");
  };

  if (isCheckingSession || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <p className="text-sm text-[var(--muted-foreground)]">
          Loading your dashboard…
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
        <div className="app-card max-w-md p-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button
            className="app-button-secondary mt-4"
            type="button"
            onClick={() => void loadDashboardData()}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const { income, outgoing } = getCurrentMonthIncomeAndExpenses(
    salary,
    expenses,
  );

  const balance = income - outgoing;
  const categoryData = getExpenseBreakdown(expenses);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Track this month's cash flow and where your spending goes."
    >
      <div className="mb-6 flex justify-end">
        <button
          className="app-button-secondary"
          type="button"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </div>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="app-card p-5">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            Current Month Income
          </p>

          <p className="mt-3 text-3xl font-semibold text-[var(--olive-strong)]">
            {formatCurrency(income)}
          </p>
        </div>

        <div className="app-card p-5">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            Current Month Expenses
          </p>

          <p className="mt-3 text-3xl font-semibold text-[var(--accent-strong)]">
            {formatCurrency(outgoing)}
          </p>
        </div>

        <div className="app-card p-5 sm:col-span-2 lg:col-span-1">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            Net Balance
          </p>

          <p
            className={`mt-3 text-3xl font-semibold ${
              balance >= 0
                ? "text-[var(--olive-strong)]"
                : "text-[var(--accent-strong)]"
            }`}
          >
            {formatCurrency(balance)}
          </p>
        </div>
      </section>

      <section className="app-card mt-6 p-5 md:p-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">
          Category-wise Expense Breakdown
        </h2>

        <p className="mb-4 text-sm text-[var(--muted-foreground)]">
          Current month spending by category.
        </p>

        <ExpenseBreakdownChart data={categoryData} />
      </section>
    </AppShell>
  );
}
