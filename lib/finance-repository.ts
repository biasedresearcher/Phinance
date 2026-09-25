import type { Envelope, FinanceData, Transaction } from "./types";
import {
  addMonths,
  localDate,
  localMonth,
  monthDate,
  validDate,
  validMonth,
} from "./dates";

export const STORAGE_KEY = "phinance-v2";
export const LEGACY_KEY = "phinanc-data";
export const BACKUP_KEY = "phinance-v2-last-good";
export const DEFAULT_CATEGORIES = [
  "Housing",
  "Food",
  "Transport",
  "Utilities",
  "Entertainment",
  "Health",
  "Family",
  "Education",
  "Other",
];
export function emptyData(): FinanceData {
  return {
    accounts: [],
    transactions: [],
    loans: [],
    investments: [],
    bills: [],
    budgets: [],
    categories: [...DEFAULT_CATEGORIES],
    settings: {
      payday: 1,
      expectedSalary: 0,
      protectedCash: 0,
      legacyReview: false,
    },
  };
}
const fail = (message: string): never => {
  throw new Error(message);
};
function obj(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, optional = false): string {
  if (
    typeof value !== "string" ||
    value.length > 2000 ||
    (!optional && !value.trim())
  )
    return fail(`${label} is missing or invalid.`);
  return value;
}
function num(value: unknown, label: string, min = 0, max = 1e9): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    return fail(`${label} is outside the supported range.`);
  return value;
}
function amount(value: unknown, label: string, min = 0): number {
  const n = num(value, label, min);
  if (Math.abs(n * 100 - Math.round(n * 100)) > 0.00001)
    return fail(`${label} must have at most two decimal places.`);
  return n;
}
function day(value: unknown): number {
  const n = num(value, "Day", 1, 31);
  if (!Number.isInteger(n)) return fail("Day must be a whole number.");
  return n;
}
function date(value: unknown, label: string, optional = false): string {
  if (optional && value === "") return "";
  if (!validDate(value)) return fail(`${label} must be a valid date.`);
  return value;
}
function month(value: unknown, label: string, optional = false): string {
  if (optional && value === "") return "";
  if (!validMonth(value)) return fail(`${label} must be a valid month.`);
  return value;
}
function bool(value: unknown, label: string): boolean {
  if (typeof value !== "boolean")
    return fail(`${label} must be true or false.`);
  return value;
}
function list<T>(
  value: unknown,
  label: string,
  parse: (v: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(value) || value.length > 50000)
    return fail(`${label} must be a supported list.`);
  return value.map((v) => parse(obj(v, label)));
}
function choice<T extends string>(
  v: unknown,
  values: readonly T[],
  label: string,
): T {
  if (!values.includes(v as T)) return fail(`${label} is invalid.`);
  return v as T;
}

export function validateData(value: unknown): FinanceData {
  const d = obj(value, "Finance data");
  const s = obj(d.settings, "Settings");
  const data: FinanceData = {
    accounts: list(d.accounts, "Accounts", (a) => ({
      id: text(a.id, "Account ID"),
      name: text(a.name, "Account name"),
      kind: choice(a.kind, ["bank", "cash", "savings"], "Account type"),
      openingBalance: amount(a.openingBalance, "Opening balance", -1e9),
      openingDate: date(a.openingDate, "Opening date"),
      spendable: bool(a.spendable, "Spendable account"),
    })),
    transactions: list(d.transactions, "Transactions", (t) => ({
      id: text(t.id, "Transaction ID"),
      kind: choice(
        t.kind,
        ["income", "expense", "transfer", "investment", "loan_payment"],
        "Transaction type",
      ),
      amount: amount(t.amount, "Transaction amount", 0.01),
      date: date(t.date, "Transaction date"),
      accountId: text(t.accountId, "Account", true),
      category: text(t.category, "Category"),
      note: text(t.note, "Note", true),
      ...(t.toAccountId !== undefined
        ? { toAccountId: text(t.toAccountId, "Destination account") }
        : {}),
      ...(t.loanId !== undefined ? { loanId: text(t.loanId, "Loan") } : {}),
      ...(t.investmentId !== undefined
        ? { investmentId: text(t.investmentId, "Investment") }
        : {}),
      ...(t.billId !== undefined ? { billId: text(t.billId, "Bill") } : {}),
      ...(t.occurrence !== undefined
        ? { occurrence: date(t.occurrence, "Due date") }
        : {}),
      ...(t.salaryMonth !== undefined
        ? { salaryMonth: month(t.salaryMonth, "Salary month") }
        : {}),
    })),
    loans: list(d.loans, "Loans", (l) => ({
      id: text(l.id, "Loan ID"),
      name: text(l.name, "Loan name"),
      amount: amount(l.amount, "Loan principal", 0.01),
      interestRate: num(l.interestRate, "Annual interest rate", 0, 100),
      monthlyInstallment: amount(
        l.monthlyInstallment,
        "Monthly instalment",
        0.01,
      ),
      startDate: date(l.startDate, "Loan opening date"),
      firstDueDate: date(l.firstDueDate, "First due date"),
    })),
    investments: list(d.investments, "Investments", (i) => ({
      id: text(i.id, "Investment ID"),
      name: text(i.name, "Investment name"),
      type: choice(i.type, ["SIP", "Lump Sum"], "Investment type"),
      currentValue: amount(i.currentValue, "Current value"),
      valuedOn: date(i.valuedOn, "Valuation date", true),
      ...(i.units !== undefined ? { units: num(i.units, "Units") } : {}),
      sipAmount: amount(i.sipAmount, "SIP amount"),
      sipDay: day(i.sipDay),
      startMonth: month(i.startMonth, "Investment start month"),
    })),
    bills: list(d.bills, "Bills", (b) => ({
      id: text(b.id, "Bill ID"),
      name: text(b.name, "Bill name"),
      amount: amount(b.amount, "Bill amount", 0.01),
      category: text(b.category, "Bill category"),
      dueDay: day(b.dueDay),
      startMonth: month(b.startMonth, "Bill start month"),
      endMonth: month(b.endMonth, "Bill end month", true),
    })),
    budgets: list(d.budgets, "Budgets", (b) => ({
      id: text(b.id, "Budget ID"),
      month: month(b.month, "Budget month"),
      category: text(b.category, "Budget category"),
      amount: amount(b.amount, "Budget amount", 0.01),
    })),
    categories:
      Array.isArray(d.categories) &&
      d.categories.length > 0 &&
      d.categories.length <= 100
        ? d.categories.map((c) => text(c, "Category"))
        : fail("Add between 1 and 100 categories."),
    settings: {
      payday: day(s.payday),
      expectedSalary: amount(s.expectedSalary, "Expected salary"),
      protectedCash: amount(s.protectedCash, "Protected cash"),
      legacyReview: bool(s.legacyReview, "Legacy review"),
    },
  };
  for (const rows of [
    data.accounts,
    data.transactions,
    data.loans,
    data.investments,
    data.bills,
    data.budgets,
  ])
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      fail("Duplicate record IDs were found.");
  if (new Set(data.categories).size !== data.categories.length)
    fail("Category names must be unique.");
  if (
    new Set(data.budgets.map((b) => `${b.month}:${b.category}`)).size !==
    data.budgets.length
  )
    fail("Only one budget per category and month is allowed.");
  for (const loan of data.loans)
    if (loan.firstDueDate <= loan.startDate)
      fail("First loan due date must follow the opening date.");
  for (const bill of data.bills)
    if (bill.endMonth && bill.endMonth < bill.startMonth)
      fail("A bill cannot end before it starts.");
  const has = (rows: { id: string }[], id: string | undefined) =>
    rows.some((r) => r.id === id);
  for (const t of data.transactions) {
    if (t.accountId && !has(data.accounts, t.accountId))
      fail("A transaction refers to a missing account.");
    if (
      t.kind === "transfer" &&
      (!has(data.accounts, t.toAccountId) ||
        t.toAccountId === t.accountId ||
        !t.accountId)
    )
      fail("Transfers require two different accounts.");
    if (t.kind !== "transfer" && t.toAccountId)
      fail("Only transfers may have a destination account.");
    if (t.kind === "loan_payment" && !has(data.loans, t.loanId))
      fail("A loan payment needs an existing loan.");
    if (t.kind === "investment" && !has(data.investments, t.investmentId))
      fail("A contribution needs an existing investment.");
    if (
      (t.loanId && t.kind !== "loan_payment") ||
      (t.investmentId && t.kind !== "investment") ||
      (t.billId && (t.kind !== "expense" || !has(data.bills, t.billId)))
    )
      fail("Transaction links do not match its type.");
    const loan = data.loans.find((l) => l.id === t.loanId);
    const bill = data.bills.find((b) => b.id === t.billId);
    if (
      t.occurrence &&
      loan &&
      (t.occurrence < loan.firstDueDate ||
        t.occurrence !==
          monthDate(
            t.occurrence.slice(0, 7),
            Number(loan.firstDueDate.slice(8)),
          ))
    )
      fail("The linked due date does not match the loan schedule.");
    if (
      bill &&
      (!t.occurrence ||
        t.occurrence.slice(0, 7) < bill.startMonth ||
        (bill.endMonth && t.occurrence.slice(0, 7) > bill.endMonth) ||
        t.occurrence !== monthDate(t.occurrence.slice(0, 7), bill.dueDay))
    )
      fail("The linked due date does not match the bill schedule.");
    if (loan && t.date < loan.startDate)
      fail("A loan payment cannot precede its opening date.");
  }
  return data;
}

export function migrateLegacy(value: unknown): FinanceData {
  const d = obj(value, "Old data"),
    data = emptyData();
  data.settings.legacyReview = true;
  const add = (t: Transaction) => data.transactions.push(t);
  list(d.expenses, "Old expenses", (e) => {
    add({
      id: `expense-${text(e.id, "ID")}`,
      kind: "expense",
      amount: amount(e.amount, "Expense", 0.01),
      date: date(e.date, "Expense date"),
      accountId: "",
      category: text(e.category, "Category"),
      note: text(e.note, "Note", true),
    });
    return e;
  });
  list(d.salary, "Old salaries", (s) => {
    add({
      id: `salary-${text(s.id, "ID")}`,
      kind: "income",
      amount: amount(s.amount, "Salary", 0.01),
      date: date(s.creditedOn, "Salary date"),
      salaryMonth: month(s.month, "Salary month"),
      accountId: "",
      category: "Salary",
      note: "Imported salary",
    });
    return s;
  });
  data.loans = list(d.emi, "Old loans", (l) => {
    const start = date(l.startDate, "Loan date");
    return {
      id: `loan-${text(l.id, "ID")}`,
      name: "Imported loan",
      amount: amount(l.amount, "Loan amount", 0.01),
      interestRate: num(l.interestRate, "Rate", 0, 100),
      monthlyInstallment: amount(l.monthlyInstallment, "Instalment", 0.01),
      startDate: start,
      firstDueDate: addMonths(start, 1),
    };
  });
  data.investments = list(d.investments, "Old investments", (i) => {
    const id = `investment-${text(i.id, "ID")}`,
      investedOn = date(i.date, "Investment date");
    add({
      id: `contribution-${id}`,
      kind: "investment",
      amount: amount(i.amount, "Contribution", 0.01),
      date: investedOn,
      accountId: "",
      investmentId: id,
      category: "Investments",
      note: "Imported contribution",
    });
    return {
      id,
      name: "Imported investment",
      type: choice(i.type, ["SIP", "Lump Sum"], "Investment type"),
      currentValue: amount(i.currentValue, "Current value"),
      valuedOn: "",
      sipAmount: 0,
      sipDay: Number(investedOn.slice(8)),
      startMonth: investedOn.slice(0, 7),
    };
  });
  data.categories = Array.from(
    new Set([
      ...data.categories,
      ...data.transactions
        .filter((t) => t.kind === "expense")
        .map((t) => t.category),
    ]),
  );
  return validateData(data);
}
export function parseBackup(raw: string): FinanceData {
  if (raw.length > 5_000_000)
    fail("This backup is larger than the 5 MB limit.");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return fail(
      "This file is not valid JSON. Your current data has not changed.",
    );
  }
  const v = obj(value, "Backup");
  if (v.schemaVersion === 2) return validateData(v.data);
  if (v.schemaVersion !== undefined)
    return fail("Unsupported backup version. Your data has not changed.");
  return migrateLegacy(v);
}
export function parseEnvelope(raw: string): Envelope {
  const e = obj(JSON.parse(raw), "Saved data");
  if (e.schemaVersion !== 2) fail("Unsupported saved-data version.");
  const revision = num(e.revision, "Revision", 0, Number.MAX_SAFE_INTEGER);
  if (!Number.isInteger(revision)) fail("Invalid revision.");
  return {
    schemaVersion: 2,
    revision,
    updatedAt: text(e.updatedAt, "Saved timestamp"),
    data: validateData(e.data),
  };
}
export function readStored(storage: Pick<Storage, "getItem">): {
  data: FinanceData;
  revision: number;
  raw: string | null;
  migrated: boolean;
} {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw !== null) {
    const e = parseEnvelope(raw);
    return { data: e.data, revision: e.revision, raw, migrated: false };
  }
  const legacy = storage.getItem(LEGACY_KEY);
  return {
    data: legacy !== null ? parseBackup(legacy) : emptyData(),
    revision: 0,
    raw: null,
    migrated: legacy !== null,
  };
}
export function writeStored(
  storage: Pick<Storage, "getItem" | "setItem">,
  data: FinanceData,
  expectedRaw: string | null,
): Envelope {
  const current = storage.getItem(STORAGE_KEY);
  if (current !== expectedRaw)
    fail(
      "Another tab changed your records. Reload the latest records before saving again.",
    );
  const valid = validateData(data);
  const revision = current ? parseEnvelope(current).revision + 1 : 1;
  if (current) storage.setItem(BACKUP_KEY, current);
  const envelope: Envelope = {
    schemaVersion: 2,
    revision,
    updatedAt: new Date().toISOString(),
    data: valid,
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  return envelope;
}
export function demoData(): FinanceData {
  const d = emptyData(),
    today = localDate(),
    month = localMonth();
  d.accounts = [
    {
      id: "demo-account",
      name: "Demo salary account",
      kind: "bank",
      openingBalance: 10000,
      openingDate: `${month}-01`,
      spendable: true,
    },
  ];
  d.transactions = [
    {
      id: "demo-income",
      kind: "income",
      amount: 50000,
      date: `${month}-01`,
      accountId: "demo-account",
      category: "Salary",
      note: "Sample only",
      salaryMonth: month,
    },
    {
      id: "demo-expense",
      kind: "expense",
      amount: 12000,
      date: today,
      accountId: "demo-account",
      category: "Housing",
      note: "Sample rent",
    },
  ];
  d.settings.payday = 1;
  d.settings.protectedCash = 10000;
  d.budgets = [{ id: "demo-budget", month, category: "Food", amount: 6000 }];
  return d;
}
