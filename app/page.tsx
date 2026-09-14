import { AppShell } from "@/components/AppShell";
import { ExpenseBreakdownChart } from "@/components/ExpenseBreakdownChart";
import { getCurrentMonthIncomeAndExpenses, getExpenseBreakdown, formatCurrency } from "@/lib/finance-utils";
import { getFinanceRepository } from "@/lib/finance-repository";

export default function DashboardPage() {
  const repository = getFinanceRepository();
  const expenses = repository.listExpenses();
  const salaries = repository.listSalaries();
  const { income, outgoing } = getCurrentMonthIncomeAndExpenses(salaries, expenses);
  const balance = income - outgoing;
  const categoryData = getExpenseBreakdown(expenses);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Track this month\'s cash flow and where your spending goes."
    >
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="app-card p-5">
          <p className="text-sm font-medium text-slate-500">Current Month Income</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-600">{formatCurrency(income)}</p>
        </div>
        <div className="app-card p-5">
          <p className="text-sm font-medium text-slate-500">Current Month Expenses</p>
          <p className="mt-3 text-3xl font-semibold text-rose-600">{formatCurrency(outgoing)}</p>
        </div>
        <div className="app-card p-5 sm:col-span-2 lg:col-span-1">
          <p className="text-sm font-medium text-slate-500">Net Balance</p>
          <p className={`mt-3 text-3xl font-semibold ${balance >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </section>

      <section className="app-card mt-6 p-5 md:p-6">
        <h2 className="text-xl font-semibold text-slate-900">Category-wise Expense Breakdown</h2>
        <p className="mb-4 text-sm text-slate-500">Current month spending by category.</p>
        <ExpenseBreakdownChart data={categoryData} />
      </section>
    </AppShell>
  );
}
