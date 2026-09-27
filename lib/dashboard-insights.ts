import { cashFlow, money } from "./finance-utils";
import { monthDate, shiftMonth } from "./dates";
import type { Transaction } from "./types";

/** Calendar-month history, capped at today so planned entries never look paid. */
export function monthlyInsights(
  transactions: Transaction[],
  month: string,
  today: string,
) {
  return Array.from({ length: 6 }, (_, index) => {
    const key = shiftMonth(month, index - 5);
    const end = monthDate(key, 31);
    const flow = cashFlow(transactions, `${key}-01`, end > today ? today : end);
    return {
      month: key,
      income: flow.income,
      outflows: money(flow.expenses + flow.loanPayments + flow.investments),
      net: flow.surplus,
    };
  });
}
