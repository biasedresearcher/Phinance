import { EmiEntry, ExpenseEntry, SalaryEntry } from "@/lib/types";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const getCurrentMonthIncomeAndExpenses = (
  salaries: SalaryEntry[],
  expenses: ExpenseEntry[],
) => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const income = salaries
    .filter((entry) => {
      const date = new Date(entry.creditedOn);
      return date.getMonth() === month && date.getFullYear() === year;
    })
    .reduce((sum, entry) => sum + entry.amount, 0);

  const outgoing = expenses
    .filter((entry) => {
      const date = new Date(entry.date);
      return date.getMonth() === month && date.getFullYear() === year;
    })
    .reduce((sum, entry) => sum + entry.amount, 0);

  return { income, outgoing };
};

export const getExpenseBreakdown = (expenses: ExpenseEntry[]) => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const totals = new Map<string, number>();

  expenses.forEach((expense) => {
    const date = new Date(expense.date);
    if (date.getMonth() !== month || date.getFullYear() !== year) {
      return;
    }

    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
  });

  return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
};

const getMonthDiff = (startDate: Date, endDate: Date) => {
  const years = endDate.getFullYear() - startDate.getFullYear();
  const months = endDate.getMonth() - startDate.getMonth();
  return years * 12 + months;
};

export const getRemainingInstallments = (emi: EmiEntry) => {
  const totalPayable = emi.amount * (1 + emi.interestRate / 100);
  const totalInstallments = Math.max(
    1,
    Math.ceil(totalPayable / Math.max(emi.monthlyInstallment, 1)),
  );
  const monthsElapsed = Math.max(0, getMonthDiff(new Date(emi.startDate), new Date()));

  return Math.max(totalInstallments - monthsElapsed, 0);
};
