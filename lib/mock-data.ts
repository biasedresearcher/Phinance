import { EmiEntry, ExpenseEntry, InvestmentEntry, SalaryEntry } from "@/lib/types";

const now = new Date();
const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 8)
  .toISOString()
  .slice(0, 10);
const currentMonthDate2 = new Date(now.getFullYear(), now.getMonth(), 14)
  .toISOString()
  .slice(0, 10);
const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 16)
  .toISOString()
  .slice(0, 10);

export const expenseCategories: ExpenseEntry["category"][] = [
  "Housing",
  "Food",
  "Transport",
  "Utilities",
  "Entertainment",
  "Health",
  "Other",
];

export const mockExpenses: ExpenseEntry[] = [
  {
    id: "exp-1",
    amount: 22000,
    category: "Housing",
    date: currentMonthDate,
    note: "Rent",
  },
  {
    id: "exp-2",
    amount: 4500,
    category: "Food",
    date: currentMonthDate2,
    note: "Groceries",
  },
  {
    id: "exp-3",
    amount: 1600,
    category: "Transport",
    date: previousMonthDate,
    note: "Fuel",
  },
];

export const mockEmis: EmiEntry[] = [
  {
    id: "emi-1",
    amount: 350000,
    monthlyInstallment: 8500,
    interestRate: 8.5,
    startDate: new Date(now.getFullYear() - 1, now.getMonth() - 3, 1)
      .toISOString()
      .slice(0, 10),
  },
];

export const mockInvestments: InvestmentEntry[] = [
  {
    id: "inv-1",
    type: "SIP",
    amount: 5000,
    currentValue: 5620,
    date: currentMonthDate,
  },
  {
    id: "inv-2",
    type: "Lump Sum",
    amount: 30000,
    currentValue: 32900,
    date: previousMonthDate,
  },
];

export const mockSalaries: SalaryEntry[] = [
  {
    id: "sal-1",
    month: currentMonthDate.slice(0, 7),
    amount: 85000,
    creditedOn: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  },
  {
    id: "sal-2",
    month: previousMonthDate.slice(0, 7),
    amount: 85000,
    creditedOn: previousMonthDate,
  },
];
