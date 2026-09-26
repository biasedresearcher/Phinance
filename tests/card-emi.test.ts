import test from "node:test";
import assert from "node:assert/strict";
import { emptyData, validateData } from "../lib/finance-repository";
import { loanStatus, commitments } from "../lib/finance-utils";
import { addMonths } from "../lib/dates";
import type { Loan } from "../lib/types";
const emi: Loan = {
  id: "card-emi",
  name: "Phone",
  cardName: "HDFC · 1234",
  balanceBasis: "purchase",
  amount: 12000,
  interestRate: 12,
  monthlyInstallment: 1100,
  startDate: "2026-08-29",
  firstStatementDate: "2026-10-05",
  firstDueDate: "2026-10-25",
};
test("card identity and separate purchase/statement/payment dates survive backup and sync validation", () => {
  const d = emptyData();
  d.loans = [emi];
  assert.deepEqual(validateData(JSON.parse(JSON.stringify(d))).loans[0], emi);
});
test("a delayed first bill is not due or accruing monthly instalments on the purchase anniversary", () => {
  const d = emptyData();
  d.loans = [emi];
  const before = loanStatus(emi, [], "2026-09-29");
  assert.equal(before.principal, 12000);
  assert.equal(before.accruedInterest, 0);
  assert.equal(
    commitments(d, "2026-09-01", "2026-09-30").filter((c) => c.kind === "loan")
      .length,
    0,
  );
  const due = commitments(d, "2026-10-01", "2026-10-31").filter(
    (c) => c.kind === "loan",
  );
  assert.equal(due.length, 1);
  assert.equal(due[0].date, "2026-10-25");
  assert.equal(loanStatus(emi, [], "2026-10-25").accruedInterest, 120);
});
test("impossible statement dates are rejected and existing loan data remains compatible", () => {
  const d = emptyData();
  d.loans = [{ ...emi, firstStatementDate: "2026-10-26" }];
  assert.throws(() => validateData(d), /statement date/);
  d.loans = [{ ...emi, firstStatementDate: "2026-08-01" }];
  assert.throws(() => validateData(d), /before the purchase/);
  d.loans = [
    {
      id: "old",
      name: "Old EMI",
      amount: 12000,
      interestRate: 12,
      monthlyInstallment: 1100,
      startDate: "2026-08-29",
      firstDueDate: "2026-10-25",
    },
  ];
  assert.deepEqual(validateData(d).loans, d.loans);
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2026-01-31", 2), "2026-03-31");
});
