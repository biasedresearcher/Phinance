import test from "node:test";
import assert from "node:assert/strict";
import { monthlyInsights } from "../lib/dashboard-insights";
import type { Transaction } from "../lib/types";
test("dashboard history crosses years, excludes transfers and future entries, includes all paid outflows", () => {
  const tx = (
    kind: Transaction["kind"],
    amount: number,
    date = "2026-02-01",
  ): Transaction => ({
    id: `${kind}${date}`,
    kind,
    amount,
    date,
    accountId: "a",
    category: "Other",
    note: "",
  });
  const rows = monthlyInsights(
    [
      tx("income", 100),
      tx("expense", 20),
      tx("loan_payment", 30),
      tx("investment", 60),
      tx("transfer", 999),
      tx("income", 999, "2026-02-28"),
    ],
    "2026-02",
    "2026-02-10",
  );
  assert.equal(rows.length, 6);
  assert.equal(rows[0].month, "2025-09");
  assert.deepEqual(rows[5], {
    month: "2026-02",
    income: 100,
    outflows: 110,
    net: -10,
  });
  assert.equal(rows[0].income, 0);
});
