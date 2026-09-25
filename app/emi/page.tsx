"use client";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { Field, Empty, Notice } from "@/components/finance/UI";
import { TransactionForm } from "@/components/finance/TransactionForm";
import { TransactionList } from "@/components/finance/TransactionList";
import { useFinanceData } from "@/lib/use-finance-data";
import { localDate, addMonths } from "@/lib/dates";
import { formatCurrency, loanStatus } from "@/lib/finance-utils";
import type { Loan } from "@/lib/types";
export default function LoansPage() {
  const { data, setData } = useFinanceData();
  const [editing, setEditing] = useState<string>();
  const [pay, setPay] = useState<string>();
  const blank = () => ({
    name: "",
    amount: "",
    interestRate: "",
    monthlyInstallment: "",
    startDate: localDate(),
    firstDueDate: addMonths(localDate(), 1),
  });
  const [form, setForm] = useState(blank);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const loan: Loan = {
      ...form,
      id: editing ?? crypto.randomUUID(),
      amount: Number(form.amount),
      interestRate: Number(form.interestRate),
      monthlyInstallment: Number(form.monthlyInstallment),
    };
    if (
      await setData((d) => ({
        ...d,
        loans: editing
          ? d.loans.map((l) => (l.id === editing ? loan : l))
          : [...d.loans, loan],
      }))
    ) {
      setEditing(undefined);
      setForm(blank());
    }
  };
  return (
    <AppShell
      title="Loans & EMI"
      subtitle="Record actual payments. Time passing alone never reduces your loan principal."
    >
      <Notice>
        For an existing loan, enter the lender’s outstanding principal as the
        opening amount and choose its balance date. Estimates assume a fixed
        annual rate, monthly reducing balance, and interest on each due date
        before payments. They exclude fees, daily interest, rate resets, and
        penalties. Reconcile with your lender’s statement.
      </Notice>
      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <form onSubmit={submit} className="app-card space-y-4 p-5">
          <h2 className="text-xl font-semibold">
            {editing ? "Edit loan" : "Add loan"}
          </h2>
          <Field label="Loan name">
            <input
              className="app-input"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          {[
            ["amount", "Opening principal (₹)"],
            ["interestRate", "Annual interest rate (%)"],
            ["monthlyInstallment", "Monthly instalment (₹)"],
          ].map(([key, label]) => (
            <Field label={label} key={key}>
              <input
                className="app-input"
                required
                type="number"
                min={key === "interestRate" ? 0 : 0.01}
                max={key === "interestRate" ? 100 : 1e9}
                step="0.01"
                value={form[key as "amount"]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
              />
            </Field>
          ))}
          <Field label="Opening balance date">
            <input
              className="app-input"
              required
              type="date"
              max={localDate()}
              value={form.startDate}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  startDate: e.target.value,
                  firstDueDate: e.target.value
                    ? addMonths(e.target.value, 1)
                    : "",
                }))
              }
            />
          </Field>
          <Field label="First instalment due after opening">
            <input
              className="app-input"
              required
              type="date"
              min={form.startDate}
              value={form.firstDueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstDueDate: e.target.value }))
              }
            />
          </Field>
          {editing ? (
            <Notice>
              Changing terms recalculates the estimate for all recorded
              payments. For a rate reset, reconcile the opening balance instead
              of rewriting the loan’s historical rate.
            </Notice>
          ) : null}
          <button className="app-button-primary" type="submit">
            {editing ? "Save loan changes" : "Save loan"}
          </button>
          {editing ? (
            <button
              className="app-button-secondary"
              type="button"
              onClick={() => {
                setEditing(undefined);
                setForm(blank());
              }}
            >
              Cancel
            </button>
          ) : null}
        </form>
        <div className="space-y-5">
          {data.loans.length ? (
            data.loans.map((l) => {
              const s = loanStatus(l, data.transactions);
              return (
                <article className="app-card space-y-3 p-5" key={l.id}>
                  <h2 className="text-xl font-semibold">{l.name}</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <p>
                      Principal remaining
                      <br />
                      <strong>{formatCurrency(s.principal)}</strong>
                    </p>
                    <p>
                      Accrued unpaid interest
                      <br />
                      <strong>{formatCurrency(s.accruedInterest)}</strong>
                    </p>
                    <p>
                      Monthly payment
                      <br />
                      <strong>{formatCurrency(l.monthlyInstallment)}</strong>
                    </p>
                    <p>
                      Estimated future payments
                      <br />
                      <strong>
                        {s.remaining === null
                          ? "Payment too low / exceeds 100 years"
                          : s.remaining}
                      </strong>
                    </p>
                  </div>
                  <p className="text-xs">
                    {l.interestRate}% annually · first due {l.firstDueDate} ·
                    estimates as of {localDate()}
                  </p>
                  {s.overpayment > 0 ? (
                    <p role="alert">
                      Recorded payments exceed the estimated balance by{" "}
                      {formatCurrency(s.overpayment)}. Reconcile your records.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="app-button-secondary"
                      type="button"
                      onClick={() => setPay(pay === l.id ? undefined : l.id)}
                    >
                      Record payment
                    </button>
                    <button
                      className="app-button-secondary"
                      type="button"
                      onClick={() => {
                        setEditing(l.id);
                        setForm({
                          ...l,
                          amount: String(l.amount),
                          interestRate: String(l.interestRate),
                          monthlyInstallment: String(l.monthlyInstallment),
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="app-button-danger"
                      type="button"
                      disabled={data.transactions.some(
                        (t) => t.loanId === l.id,
                      )}
                      title="Remove linked payments before deleting a loan"
                      onClick={() => {
                        if (confirm(`Delete ${l.name}?`))
                          void setData((d) => ({
                            ...d,
                            loans: d.loans.filter((x) => x.id !== l.id),
                          }));
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  {pay === l.id ? (
                    <TransactionForm
                      key={l.id}
                      fixedKind="loan_payment"
                      defaults={{
                        loanId: l.id,
                        amount: Math.min(l.monthlyInstallment, s.outstanding),
                      }}
                      onDone={() => setPay(undefined)}
                    />
                  ) : null}
                </article>
              );
            })
          ) : (
            <Empty>
              No loans recorded. Add one only if you have an outstanding loan.
            </Empty>
          )}
        </div>
      </div>
      <h2 className="text-xl font-semibold">Recorded loan payments</h2>
      <TransactionList
        rows={data.transactions.filter((t) => t.kind === "loan_payment")}
      />
    </AppShell>
  );
}
