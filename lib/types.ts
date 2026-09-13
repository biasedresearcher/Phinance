export type ExpenseCategory =
  | "Housing"
  | "Food"
  | "Transport"
  | "Utilities"
  | "Entertainment"
  | "Health"
  | "Other";

export interface ExpenseEntry {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  note: string;
}

export interface EmiEntry {
  id: string;
  amount: number;
  monthlyInstallment: number;
  interestRate: number;
  startDate: string;
}

export type InvestmentType = "SIP" | "Lump Sum";

export interface InvestmentEntry {
  id: string;
  type: InvestmentType;
  amount: number;
  currentValue: number;
  date: string;
}

export interface SalaryEntry {
  id: string;
  month: string;
  amount: number;
  creditedOn: string;
}
