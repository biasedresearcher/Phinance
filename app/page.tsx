"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ExpenseBreakdownChart } from "@/components/ExpenseBreakdownChart";
import {
  formatCurrency,
  getCurrentMonthIncomeAndExpenses,
  getExpenseBreakdown,
} from "@/lib/finance-utils";
import { useFinanceData } from "@/lib/use-finance-data";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const { data } = useFinanceData();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.replace("/login");
        return;
      }

      setIsCheckingSession(false);
    };

    void checkSession();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.replace("/login");
  };

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <p className="text-sm text-[var(--muted-foreground)]">
          Checking your account…
        </p>
      </main>
    );
  }

  const { income, outgoing } = getCurrentMonthIncomeAndExpenses(
    data.salary,
    data.expenses,
  );
  const balance = income - outgoing;
  const categoryData = getExpenseBreakdown(data.expenses);

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
