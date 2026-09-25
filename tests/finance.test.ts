import test from "node:test";
import assert from "node:assert/strict";
import {
  accountBalance,
  cashFlow,
  commitments,
  loanStatus,
  spendingPlan,
  sumMoney,
} from "../lib/finance-utils";
import {
  addMonths,
  localDate,
  monthDate,
  nextPayday,
  salaryCycle,
  validDate,
} from "../lib/dates";
import {
  BACKUP_KEY,
  LEGACY_KEY,
  STORAGE_KEY,
  emptyData,
  migrateLegacy,
  parseBackup,
  readStored,
  validateData,
  writeStored,
} from "../lib/finance-repository";
import type { Account, Loan, Transaction } from "../lib/types";
const account: Account = {
  id: "a",
  name: "Salary account",
  kind: "bank",
  openingBalance: 10000,
  openingDate: "2026-09-01",
  spendable: true,
};
const loan: Loan = {
  id: "l",
  name: "Loan",
  amount: 350000,
  interestRate: 8.5,
  monthlyInstallment: 8500,
  startDate: "2026-09-01",
  firstDueDate: "2026-10-01",
};
function tx(extra: Partial<Transaction> = {}): Transaction {
  return {
    id: "t",
    kind: "expense",
    amount: 100,
    date: "2026-09-10",
    accountId: "a",
    category: "Food",
    note: "",
    ...extra,
  };
}
function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
}

test("fresh records are empty and no sample salary is silently loaded", () => {
  const result = readStored(storage());
  assert.equal(result.data.transactions.length, 0);
  assert.equal(result.data.accounts.length, 0);
  assert.equal(result.revision, 0);
});
test("backup roundtrip validates IDs, money, dates and linked accounts", () => {
  const d = emptyData();
  d.accounts = [account];
  d.transactions = [tx()];
  assert.deepEqual(
    parseBackup(JSON.stringify({ schemaVersion: 2, data: d })),
    d,
  );
  for (const patch of [
    { amount: -1 },
    { amount: "100" },
    { amount: 0.001 },
    { date: "2026-02-30" },
    { accountId: "missing" },
  ]) {
    assert.throws(() =>
      validateData({ ...d, transactions: [{ ...tx(), ...patch }] }),
    );
  }
  assert.throws(() => validateData({ ...d, transactions: [tx(), tx()] }));
  assert.throws(() =>
    parseBackup(JSON.stringify({ schemaVersion: 100, data: d })),
  );
});
test("legacy entries migrate without inventing EMI payments or deleting originals", () => {
  const old = {
    expenses: [
      {
        id: "e",
        amount: 20.5,
        category: "Food",
        date: "2026-09-03",
        note: "Tea",
      },
    ],
    salary: [
      { id: "s", amount: 50000, month: "2026-08", creditedOn: "2026-09-01" },
    ],
    emi: [
      {
        id: "l",
        amount: 100000,
        monthlyInstallment: 10000,
        interestRate: 12,
        startDate: "2026-01-01",
      },
    ],
    investments: [
      {
        id: "i",
        type: "SIP",
        amount: 1000,
        currentValue: 0,
        date: "2026-09-02",
      },
    ],
  };
  const d = migrateLegacy(old);
  assert.equal(d.transactions.length, 3);
  assert.ok(d.settings.legacyReview);
  assert.equal(d.investments[0].currentValue, 0);
  assert.equal(d.investments[0].valuedOn, "");
  assert.ok(d.transactions.every((t) => !t.accountId));
  assert.equal(
    d.transactions.filter((t) => t.kind === "loan_payment").length,
    0,
  );
  const s = storage();
  s.setItem(LEGACY_KEY, JSON.stringify(old));
  const before = s.getItem(LEGACY_KEY);
  const r = readStored(s);
  writeStored(s, r.data, r.raw);
  assert.equal(s.getItem(LEGACY_KEY), before);
});
test("corrupt saved data raises a recovery error instead of returning defaults", () => {
  const s = storage();
  s.setItem(STORAGE_KEY, "{broken");
  assert.throws(() => readStored(s));
  assert.equal(s.getItem(STORAGE_KEY), "{broken");
  assert.throws(
    () =>
      readStored({
        getItem() {
          throw new Error("Storage blocked");
        },
      }),
    /Storage blocked/,
  );
});
test("a last-good copy is retained and stale writers cannot overwrite a new revision", () => {
  const s = storage();
  writeStored(s, emptyData(), null);
  const first = s.getItem(STORAGE_KEY)!;
  const d = emptyData();
  d.accounts = [account];
  writeStored(s, d, first);
  assert.equal(s.getItem(BACKUP_KEY), first);
  assert.throws(() => writeStored(s, emptyData(), first), /Another tab/);
  assert.equal(readStored(s).revision, 2);
});
test("failed storage writes preserve existing records", () => {
  const s = storage();
  writeStored(s, emptyData(), null);
  const initial = s.getItem(STORAGE_KEY)!;
  assert.throws(
    () =>
      writeStored(
        {
          getItem: s.getItem,
          setItem(k, v) {
            if (k === STORAGE_KEY) throw new Error("Quota");
            s.setItem(k, v);
          },
        },
        emptyData(),
        initial,
      ),
    /Quota/,
  );
  assert.equal(s.getItem(STORAGE_KEY), initial);
});
test("paise arithmetic, transfers and inclusive opening dates reconcile", () => {
  assert.equal(sumMoney([0.1, 0.2]), 0.3);
  const entries = [
    tx({ id: "salary", kind: "income", amount: 50000, date: "2026-09-01" }),
    tx({ id: "before", amount: 999, date: "2026-08-31" }),
    tx({ id: "move", kind: "transfer", amount: 5000, toAccountId: "b" }),
  ];
  const b: Account = {
    ...account,
    id: "b",
    openingBalance: 0,
    spendable: false,
  };
  assert.equal(accountBalance(account, entries, "2026-09-10"), 55000);
  assert.equal(accountBalance(b, entries, "2026-09-10"), 5000);
  assert.equal(cashFlow(entries, "2026-09-01", "2026-09-30").surplus, 50000);
});
test("all actual outflows are counted once in cash-flow reports", () => {
  const t = [
    tx({ id: "i", kind: "income", amount: 50000 }),
    tx({ id: "e", amount: 10000 }),
    tx({ id: "l", kind: "loan_payment", amount: 8500, loanId: "l" }),
    tx({ id: "v", kind: "investment", amount: 5000, investmentId: "v" }),
    tx({ id: "tr", kind: "transfer", amount: 5000, toAccountId: "b" }),
  ];
  assert.equal(cashFlow(t, "2026-09-01", "2026-09-30").surplus, 26500);
});
test("salary is recognized when credited, not when earned", () => {
  const t = tx({
    kind: "income",
    date: "2026-09-01",
    salaryMonth: "2026-08",
    amount: 50000,
  });
  assert.equal(cashFlow([t], "2026-08-01", "2026-08-31").income, 0);
  assert.equal(cashFlow([t], "2026-09-01", "2026-09-30").income, 50000);
});
test("reducing balance estimate matches a independently amortized 49-payment example", () => {
  const s = loanStatus(loan, [], loan.startDate);
  let balance = loan.amount,
    count = 0;
  while (balance > 0) {
    balance = Math.max(
      0,
      Math.round(
        (balance * (1 + loan.interestRate / 1200) - loan.monthlyInstallment) *
          100,
      ) / 100,
    );
    count++;
  }
  assert.equal(count, 49);
  assert.equal(s.remaining, count);
  assert.equal(s.principal, 350000);
});
test("missed payments never reduce principal; recorded payments pay interest first", () => {
  const l = {
    ...loan,
    amount: 100000,
    interestRate: 12,
    monthlyInstallment: 10000,
  };
  const unpaid = loanStatus(l, [], "2026-11-01");
  assert.equal(unpaid.principal, 100000);
  assert.equal(unpaid.accruedInterest, 2000);
  const paid = loanStatus(
    l,
    [
      tx({
        kind: "loan_payment",
        amount: 10000,
        loanId: "l",
        date: "2026-10-01",
      }),
    ],
    "2026-10-01",
  );
  assert.equal(paid.principal, 91000);
  assert.equal(paid.accruedInterest, 0);
});
test("zero-interest loans, inadequate payments and early prepayment are handled", () => {
  assert.equal(
    loanStatus(
      { ...loan, amount: 100000, interestRate: 0, monthlyInstallment: 10000 },
      [],
      loan.startDate,
    ).remaining,
    10,
  );
  assert.equal(
    loanStatus(
      { ...loan, amount: 100000, interestRate: 12, monthlyInstallment: 900 },
      [],
      loan.startDate,
    ).remaining,
    null,
  );
  const status = loanStatus(
    { ...loan, amount: 100000, interestRate: 12 },
    [
      tx({
        kind: "loan_payment",
        amount: 10000,
        loanId: "l",
        date: "2026-09-15",
      }),
    ],
    "2026-10-01",
  );
  assert.equal(status.principal, 90000);
  assert.equal(status.accruedInterest, 900);
});
test("partial bill payments and month-end dates are reconciled", () => {
  const d = emptyData();
  d.bills = [
    {
      id: "b",
      name: "Rent",
      amount: 1000,
      category: "Housing",
      dueDay: 31,
      startMonth: "2026-02",
      endMonth: "",
    },
  ];
  d.transactions = [
    tx({
      amount: 400,
      billId: "b",
      occurrence: "2026-02-28",
      date: "2026-02-25",
    }),
  ];
  const c = commitments(d, "2026-02-01", "2026-02-28", "2026-02-28");
  assert.equal(c[0].date, "2026-02-28");
  assert.equal(c[0].amount, 600);
  d.transactions.push(
    tx({
      id: "paid",
      amount: 600,
      billId: "b",
      occurrence: "2026-02-28",
      date: "2026-02-28",
    }),
  );
  assert.equal(
    commitments(d, "2026-02-01", "2026-02-28", "2026-02-28").length,
    0,
  );
});
test("spending allowance includes overdue bills, excludes expected income and non-spendable accounts", () => {
  const d = emptyData();
  d.accounts = [
    account,
    { ...account, id: "savings", openingBalance: 50000, spendable: false },
  ];
  d.settings = {
    ...d.settings,
    payday: 1,
    expectedSalary: 50000,
    protectedCash: 2000,
  };
  d.bills = [
    {
      id: "b",
      name: "Rent",
      amount: 1000,
      category: "Housing",
      dueDay: 5,
      startMonth: "2026-09",
      endMonth: "",
    },
  ];
  const p = spendingPlan(d, "2026-09-24");
  assert.equal(p.cash, 10000);
  assert.equal(p.available, 7000);
  assert.equal(p.pending[0].date, "2026-09-05");
  assert.equal(p.payday, "2026-10-01");
  assert.equal(p.incomplete, false);
  d.transactions.push(tx({ accountId: "" }));
  assert.equal(spendingPlan(d, "2026-09-24").incomplete, true);
});
test("SIP plans are reduced by actual monthly contributions, not valuation updates", () => {
  const d = emptyData();
  d.investments = [
    {
      id: "v",
      name: "Fund",
      type: "SIP",
      currentValue: 100000,
      valuedOn: "2026-09-24",
      sipAmount: 5000,
      sipDay: 5,
      startMonth: "2026-09",
    },
  ];
  d.transactions = [
    tx({
      kind: "investment",
      amount: 2000,
      investmentId: "v",
      date: "2026-09-01",
    }),
  ];
  assert.equal(
    commitments(d, "2026-09-01", "2026-09-30", "2026-09-24")[0].amount,
    3000,
  );
});
test("local dates stay local in India and salary cycles handle short months", () => {
  const previous = process.env.TZ;
  process.env.TZ = "Asia/Kolkata";
  assert.equal(localDate(new Date("2026-09-25T02:00:00+05:30")), "2026-09-25");
  assert.equal(monthDate("2028-02", 31), "2028-02-29");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2026-01-31", 2), "2026-03-31");
  assert.equal(nextPayday("2026-02-28", 31), "2026-03-31");
  assert.deepEqual(salaryCycle("2026-03-01", 31), {
    start: "2026-02-28",
    end: "2026-03-31",
  });
  assert.equal(validDate("2026-02-29"), false);
  if (previous === undefined) delete process.env.TZ;
  else process.env.TZ = previous;
});
test("ordinary loan payments clear the oldest due instalment without double reserving cash", () => {
  const d = emptyData();
  d.loans = [
    { ...loan, amount: 100000, interestRate: 0, monthlyInstallment: 10000 },
  ];
  d.transactions = [
    tx({
      kind: "loan_payment",
      loanId: "l",
      amount: 10000,
      date: "2026-10-01",
    }),
  ];
  assert.equal(
    commitments(d, "2026-10-01", "2026-10-31", "2026-10-24").length,
    0,
  );
});
test("a fully repaid loan cannot leave phantom overdue commitments", () => {
  const d = emptyData();
  d.loans = [
    { ...loan, amount: 10000, interestRate: 0, monthlyInstallment: 1000 },
  ];
  d.transactions = [
    tx({
      kind: "loan_payment",
      loanId: "l",
      amount: 10000,
      date: "2026-11-24",
    }),
  ];
  assert.equal(
    commitments(d, "2026-10-01", "2026-12-01", "2026-11-24").length,
    0,
  );
});
test("loan commitments are capped by the remaining balance", () => {
  const d = emptyData();
  d.loans = [
    { ...loan, amount: 1000, interestRate: 0, monthlyInstallment: 800 },
  ];
  const c = commitments(d, "2026-10-01", "2026-12-31", "2026-12-24");
  assert.equal(sumMoney(c.map((x) => x.amount)), 1000);
  assert.equal(c.length, 2);
});
