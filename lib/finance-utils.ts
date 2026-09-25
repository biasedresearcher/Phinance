import type {
  Account,
  Commitment,
  FinanceData,
  Loan,
  Transaction,
} from "./types";
import {
  addMonths,
  localDate,
  monthDate,
  nextPayday,
  shiftMonth,
} from "./dates";

export const paise = (value: number) => Math.round(value * 100);
export const rupees = (value: number) => value / 100;
export const money = (value: number) => rupees(paise(value));
export const sumMoney = (values: number[]) =>
  rupees(values.reduce((sum, value) => sum + paise(value), 0));
export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
export const kindLabel: Record<Transaction["kind"], string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  investment: "Investment",
  loan_payment: "Loan payment",
};

export function accountBalance(
  account: Account,
  transactions: Transaction[],
  asOf = localDate(),
) {
  if (account.openingDate > asOf) return 0;
  let balance = paise(account.openingBalance);
  for (const entry of transactions) {
    if (entry.date < account.openingDate || entry.date > asOf) continue;
    if (entry.accountId === account.id)
      balance += (entry.kind === "income" ? 1 : -1) * paise(entry.amount);
    if (entry.kind === "transfer" && entry.toAccountId === account.id)
      balance += paise(entry.amount);
  }
  return rupees(balance);
}
export function cashFlow(
  transactions: Transaction[],
  from: string,
  to: string,
) {
  const rows = transactions.filter((t) => t.date >= from && t.date <= to);
  const total = (kind: Transaction["kind"]) =>
    sumMoney(rows.filter((t) => t.kind === kind).map((t) => t.amount));
  const income = total("income"),
    expenses = total("expense"),
    investments = total("investment"),
    loanPayments = total("loan_payment");
  return {
    income,
    expenses,
    investments,
    loanPayments,
    surplus: money(income - expenses - investments - loanPayments),
  };
}
export function expenseBreakdown(
  transactions: Transaction[],
  from: string,
  to: string,
) {
  const totals = new Map<string, number>();
  transactions
    .filter((t) => t.kind === "expense" && t.date >= from && t.date <= to)
    .forEach((t) =>
      totals.set(t.category, (totals.get(t.category) ?? 0) + paise(t.amount)),
    );
  return Array.from(totals, ([name, value]) => ({
    name,
    value: rupees(value),
  })).sort((a, b) => b.value - a.value);
}

// Monthly interest is accrued on the due date, before same-day payments. No
// late fees, daily interest, interest capitalization, or rate changes are assumed.
export function loanStatus(
  loan: Loan,
  transactions: Transaction[],
  asOf = localDate(),
) {
  let principal = paise(loan.amount),
    interest = 0,
    overpayment = 0,
    totalInterest = 0;
  const payments = transactions
    .filter(
      (t) =>
        t.kind === "loan_payment" &&
        t.loanId === loan.id &&
        t.date >= loan.startDate &&
        t.date <= asOf,
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let due = loan.firstDueDate,
    periods = 0;
  const accrueUntil = (date: string) => {
    while (due <= date && periods < 3600 && principal > 0) {
      const accrued = Math.round((principal * loan.interestRate) / 1200);
      interest += accrued;
      totalInterest += accrued;
      periods++;
      due = addMonths(loan.firstDueDate, periods);
    }
  };
  for (const payment of payments) {
    accrueUntil(payment.date);
    let amount = paise(payment.amount);
    const interestPaid = Math.min(interest, amount);
    interest -= interestPaid;
    amount -= interestPaid;
    const principalPaid = Math.min(principal, amount);
    principal -= principalPaid;
    overpayment += amount - principalPaid;
  }
  accrueUntil(asOf);
  let projectedPrincipal = principal,
    projectedInterest = interest,
    remaining: number | null = 0;
  const installment = paise(loan.monthlyInstallment);
  if (
    projectedPrincipal > 0 &&
    installment <= Math.round((projectedPrincipal * loan.interestRate) / 1200)
  )
    remaining = null;
  else {
    while (projectedPrincipal + projectedInterest > 0 && remaining! < 1200) {
      projectedInterest += Math.round(
        (projectedPrincipal * loan.interestRate) / 1200,
      );
      const paidInterest = Math.min(projectedInterest, installment);
      projectedInterest -= paidInterest;
      projectedPrincipal = Math.max(
        0,
        projectedPrincipal - (installment - paidInterest),
      );
      remaining!++;
    }
    if (remaining! >= 1200) remaining = null;
  }
  return {
    principal: rupees(principal),
    accruedInterest: rupees(interest),
    outstanding: rupees(principal + interest),
    totalInterest: rupees(totalInterest),
    overpayment: rupees(overpayment),
    remaining,
    nextDue: due,
    periods,
  };
}

export function loanPaymentCredits(
  loan: Loan,
  transactions: Transaction[],
  asOf: string,
) {
  const paid = new Map<string, number>();
  const dueDates: string[] = [];
  for (let n = 0; n < 3600; n++) {
    const due = addMonths(loan.firstDueDate, n);
    if (due > asOf) break;
    dueDates.push(due);
  }
  const installment = paise(loan.monthlyInstallment);
  const apply = (due: string, available: number) => {
    const used = Math.min(
      Math.max(0, installment - (paid.get(due) ?? 0)),
      available,
    );
    paid.set(due, (paid.get(due) ?? 0) + used);
    return available - used;
  };
  const payments = transactions
    .filter(
      (t) =>
        t.kind === "loan_payment" && t.loanId === loan.id && t.date <= asOf,
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const t of payments) {
    let remaining = paise(t.amount);
    if (t.occurrence) remaining = apply(t.occurrence, remaining);
    for (const due of dueDates) {
      if (due > t.date || remaining <= 0) break;
      remaining = apply(due, remaining);
    }
    // Anything beyond scheduled amounts already due is principal prepayment.
  }
  return paid;
}

export function commitments(
  data: FinanceData,
  from: string,
  to: string,
  asOf = localDate(),
): Commitment[] {
  const result: Commitment[] = [];
  let month = from.slice(0, 7);
  for (
    let n = 0;
    month <= to.slice(0, 7) && n < 3600;
    n++, month = shiftMonth(month, 1)
  ) {
    for (const bill of data.bills) {
      const date = monthDate(month, bill.dueDay);
      if (
        month < bill.startMonth ||
        (bill.endMonth && month > bill.endMonth) ||
        date < from ||
        date > to
      )
        continue;
      const paid = sumMoney(
        data.transactions
          .filter(
            (t) =>
              t.kind === "expense" &&
              t.billId === bill.id &&
              t.occurrence === date &&
              t.date <= asOf,
          )
          .map((t) => t.amount),
      );
      const amount = money(Math.max(0, bill.amount - paid));
      if (amount)
        result.push({
          id: `bill:${bill.id}:${date}`,
          kind: "bill",
          referenceId: bill.id,
          name: bill.name,
          date,
          amount,
          category: bill.category,
        });
    }
    for (const investment of data.investments) {
      const date = monthDate(month, investment.sipDay);
      if (
        investment.type !== "SIP" ||
        investment.sipAmount <= 0 ||
        month < investment.startMonth ||
        date < from ||
        date > to
      )
        continue;
      const paid = sumMoney(
        data.transactions
          .filter(
            (t) =>
              t.kind === "investment" &&
              t.investmentId === investment.id &&
              t.date.slice(0, 7) === month &&
              t.date <= asOf,
          )
          .map((t) => t.amount),
      );
      const amount = money(Math.max(0, investment.sipAmount - paid));
      if (amount)
        result.push({
          id: `sip:${investment.id}:${date}`,
          kind: "sip",
          referenceId: investment.id,
          name: investment.name,
          date,
          amount,
          category: "Investments",
        });
    }
  }
  for (const loan of data.loans) {
    const current = loanStatus(loan, data.transactions, asOf);
    if (current.outstanding <= 0) continue;
    const credits = loanPaymentCredits(loan, data.transactions, asOf);
    let left = paise(current.outstanding);
    for (let n = 0; n < 3600; n++) {
      const date = addMonths(loan.firstDueDate, n);
      if (date > to) break;
      if (date < from) continue;
      if (date > asOf)
        left += Math.round(
          (paise(current.principal) * loan.interestRate) / 1200,
        );
      const amount = Math.max(
        0,
        Math.min(
          paise(loan.monthlyInstallment) - (credits.get(date) ?? 0),
          left,
        ),
      );
      if (amount) {
        result.push({
          id: `loan:${loan.id}:${date}`,
          kind: "loan",
          referenceId: loan.id,
          name: loan.name,
          date,
          amount: rupees(amount),
          category: "Loan payments",
        });
        left -= amount;
      }
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
export function spendingPlan(data: FinanceData, today = localDate()) {
  const payday = nextPayday(today, data.settings.payday);
  // Include unpaid past commitments, rather than letting overdue bills disappear.
  const starts = [
    ...data.bills.map((b) => `${b.startMonth}-01`),
    ...data.loans.map((l) => l.firstDueDate),
    ...data.investments
      .filter((i) => i.sipAmount > 0)
      .map((i) => `${i.startMonth}-01`),
    today,
  ];
  const pending = commitments(data, starts.sort()[0], payday, today).filter(
    (c) => c.date < payday,
  );
  const cash = sumMoney(
    data.accounts
      .filter((a) => a.spendable)
      .map((a) => accountBalance(a, data.transactions, today)),
  );
  const reserved = data.settings.protectedCash;
  const due = sumMoney(pending.map((c) => c.amount));
  const incomplete =
    data.accounts.length === 0 ||
    data.transactions.some(
      (t) => !t.accountId || (t.kind === "transfer" && !t.toAccountId),
    );
  return {
    payday,
    cash,
    reserved,
    due,
    pending,
    available: money(cash - due - reserved),
    incomplete,
  };
}
