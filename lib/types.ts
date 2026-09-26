export type TransactionKind =
  "income" | "expense" | "transfer" | "investment" | "loan_payment";
export interface Account {
  id: string;
  name: string;
  kind: "bank" | "cash" | "savings";
  openingBalance: number;
  openingDate: string;
  spendable: boolean;
}
export interface Transaction {
  id: string;
  kind: TransactionKind;
  amount: number;
  date: string;
  accountId: string;
  toAccountId?: string;
  category: string;
  note: string;
  salaryMonth?: string;
  loanId?: string;
  investmentId?: string;
  billId?: string;
  occurrence?: string;
}
export interface Loan {
  cardName?: string;
  balanceBasis?: "purchase" | "remaining";
  firstStatementDate?: string;
  id: string;
  name: string;
  amount: number;
  interestRate: number;
  monthlyInstallment: number;
  startDate: string;
  firstDueDate: string;
}
export interface Investment {
  id: string;
  name: string;
  type: "SIP" | "Lump Sum";
  currentValue: number;
  valuedOn: string;
  units?: number;
  sipAmount: number;
  sipDay: number;
  startMonth: string;
}
export interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  dueDay: number;
  startMonth: string;
  endMonth: string;
}
export interface Budget {
  id: string;
  month: string;
  category: string;
  amount: number;
}
export interface FinanceData {
  accounts: Account[];
  transactions: Transaction[];
  loans: Loan[];
  investments: Investment[];
  bills: Bill[];
  budgets: Budget[];
  categories: string[];
  settings: {
    payday: number;
    expectedSalary: number;
    protectedCash: number;
    legacyReview: boolean;
  };
}
export interface Envelope {
  schemaVersion: 2;
  revision: number;
  updatedAt: string;
  data: FinanceData;
}
export interface Commitment {
  id: string;
  kind: "bill" | "loan" | "sip";
  referenceId: string;
  name: string;
  date: string;
  amount: number;
  category: string;
}
