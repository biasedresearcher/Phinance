import { mockEmis, mockExpenses, mockInvestments, mockSalaries } from "@/lib/mock-data";
import { EmiEntry, ExpenseEntry, InvestmentEntry, SalaryEntry } from "@/lib/types";

export interface FinanceRepository {
  listExpenses: () => ExpenseEntry[];
  listEmis: () => EmiEntry[];
  listInvestments: () => InvestmentEntry[];
  listSalaries: () => SalaryEntry[];
}

export const mockFinanceRepository: FinanceRepository = {
  listExpenses: () => mockExpenses,
  listEmis: () => mockEmis,
  listInvestments: () => mockInvestments,
  listSalaries: () => mockSalaries,
};

export const getFinanceRepository = (): FinanceRepository => {
  return mockFinanceRepository;
};
