import { mockEmis, mockExpenses, mockInvestments, mockSalaries } from "@/lib/mock-data";
import { EmiEntry, ExpenseEntry, InvestmentEntry, SalaryEntry } from "@/lib/types";

export const PHINANCE_STORAGE_KEY = "phinanc-data";

export interface FinanceData {
  expenses: ExpenseEntry[];
  emi: EmiEntry[];
  investments: InvestmentEntry[];
  salary: SalaryEntry[];
}

const cloneDefaultData = (): FinanceData => ({
  expenses: mockExpenses.map((entry) => ({ ...entry })),
  emi: mockEmis.map((entry) => ({ ...entry })),
  investments: mockInvestments.map((entry) => ({ ...entry })),
  salary: mockSalaries.map((entry) => ({ ...entry })),
});

const isArray = <T>(value: unknown): value is T[] => Array.isArray(value);

export const getDefaultFinanceData = (): FinanceData => cloneDefaultData();

export const loadFinanceData = (): FinanceData => {
  const fallback = getDefaultFinanceData();

  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(PHINANCE_STORAGE_KEY);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FinanceData>;

    return {
      expenses: isArray<ExpenseEntry>(parsed.expenses) ? parsed.expenses : fallback.expenses,
      emi: isArray<EmiEntry>(parsed.emi) ? parsed.emi : fallback.emi,
      investments: isArray<InvestmentEntry>(parsed.investments) ? parsed.investments : fallback.investments,
      salary: isArray<SalaryEntry>(parsed.salary) ? parsed.salary : fallback.salary,
    };
  } catch {
    return fallback;
  }
};

export const saveFinanceData = (data: FinanceData) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PHINANCE_STORAGE_KEY, JSON.stringify(data));
};

export interface FinanceRepository {
  listExpenses: () => ExpenseEntry[];
  listEmis: () => EmiEntry[];
  listInvestments: () => InvestmentEntry[];
  listSalaries: () => SalaryEntry[];
}

export const getFinanceRepository = (): FinanceRepository => {
  const data = loadFinanceData();

  return {
    listExpenses: () => data.expenses,
    listEmis: () => data.emi,
    listInvestments: () => data.investments,
    listSalaries: () => data.salary,
  };
};
