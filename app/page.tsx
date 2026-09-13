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
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Current Month Income</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{formatCurrency(income)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Current Month Expenses</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{formatCurrency(outgoing)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-slate-500">Net Balance</p>
          <p className={`mt-2 text-2xl font-semibold ${balance >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Category-wise Expense Breakdown</h2>
        <p className="mb-4 text-sm text-slate-500">Current month spending by category.</p>
        <ExpenseBreakdownChart data={categoryData} />
      </section>
    </AppShell>
  );
}
