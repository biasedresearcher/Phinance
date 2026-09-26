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
    cardName: "",
    balanceBasis: "purchase" as "purchase" | "remaining",
    firstStatementDate: "",
    amount: "",
    interestRate: "",
    monthlyInstallment: "",
    startDate: localDate(),
    firstDueDate: "",
  });
  const [form, setForm] = useState(blank);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const loan: Loan = {
      ...form,
      cardName: form.cardName.trim() || undefined,
      firstStatementDate: form.firstStatementDate || undefined,
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
      title="Credit card EMIs"
      subtitle="Track each EMI purchase, the card it is billed to, and when that card bill must be paid."
    >
      <Notice>
        A purchase date, the statement that first includes its EMI, and that
        statement’s payment due date are different. Use the dates shown by your
        card issuer—even when the first EMI falls in a later month. Adding an
        EMI or generating a statement does not deduct money from your bank
        account; record the EMI portion when you pay the card bill, without also
        logging that same amount as a separate expense.
      </Notice>
      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <form onSubmit={submit} className="app-card space-y-4 p-5">
          <h2 className="text-xl font-semibold">
            {editing ? "Edit EMI" : "Add credit card EMI"}
          </h2>
          <Field label="Loan name">
            <input
              className="app-input"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Credit card">
            <input
              className="app-input"
              list="emi-cards"
              maxLength={100}
              placeholder="e.g. HDFC Millennia · 1234"
              required={!editing || !!form.cardName}
              value={form.cardName}
              onChange={(e) =>
                setForm((f) => ({ ...f, cardName: e.target.value }))
              }
            />
          </Field>
          <datalist id="emi-cards">
            {Array.from(
              new Set(data.loans.map((l) => l.cardName).filter(Boolean)),
            ).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <p className="text-xs">
            Card nickname and optionally its last four digits. This identifies
            the card billed, not the bank account used to pay the bill.
          </p>
          <Field label="What are you adding?">
            <select
              className="app-input"
              value={form.balanceBasis}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  balanceBasis: e.target.value as "purchase" | "remaining",
                }))
              }
            >
              <option value="purchase">A new EMI purchase</option>
              <option value="remaining">An EMI I am already paying</option>
            </select>
          </Field>
          {[
            [
              "amount",
              form.balanceBasis === "purchase"
                ? "Amount converted to EMI (₹)"
                : "Remaining principal (₹)",
            ],
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
          <Field
            label={
              form.balanceBasis === "purchase"
                ? "Purchase / EMI booking date"
                : "Remaining balance as of"
            }
          >
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
                }))
              }
            />
          </Field>
          {form.balanceBasis === "remaining" && (
            <p className="text-xs">
              Use the outstanding principal and its date from your issuer. Track
              only payments after this balance date; earlier repayments are
              already reflected in that amount.
            </p>
          )}
          <Field
            label={
              form.balanceBasis === "purchase"
                ? "First statement containing this EMI (optional)"
                : "Next unpaid EMI statement date (optional)"
            }
          >
            <input
              className="app-input"
              type="date"
              min={
                form.balanceBasis === "purchase" ? form.startDate : undefined
              }
              max={form.firstDueDate || undefined}
              value={form.firstStatementDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstStatementDate: e.target.value }))
              }
            />
          </Field>
          <p className="text-xs">
            The bill-generation date, not the date money leaves your bank. Leave
            blank if your first statement has not arrived.
          </p>
          <Field
            label={
              form.balanceBasis === "purchase"
                ? "First EMI bill payment due date"
                : "Next unpaid EMI bill payment due date"
            }
          >
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
          <p className="text-xs">
            Copy the payment due date from the card statement or issuer’s EMI
            schedule. It can be in a later month; it is never inferred from the
            purchase date.
          </p>
          {form.firstDueDate && (
            <section
              aria-label="EMI schedule preview"
              className="rounded-xl border border-[var(--border)] p-3 text-sm space-y-2"
            >
              <p>
                <strong>Your EMI timeline</strong>
              </p>
              <p>
                {form.balanceBasis === "purchase"
                  ? "Purchase / booking"
                  : "Balance recorded"}
                : {form.startDate || "Choose a date"}
              </p>
              <p>
                First tracked statement:{" "}
                {form.firstStatementDate || "Not entered"}
              </p>
              <p>
                First tracked payment due: <strong>{form.firstDueDate}</strong>
              </p>
              <p>
                Following monthly due dates:{" "}
                {[1, 2].map((n) => addMonths(form.firstDueDate, n)).join(" · ")}
              </p>
              <p className="text-xs">
                Planning dates assume the same payment due day each month,
                capped at month-end. Check your issuer’s actual dates if the
                billing cycle changes.
              </p>
            </section>
          )}
          <Notice>
            Balance and interest figures are estimates using monthly
            reducing-balance interest. Card issuers may bill different
            first-period interest, fees and GST. Use the issuer’s EMI schedule
            for exact charges; these extras are not included here.
          </Notice>
          {editing ? (
            <Notice>
              Changing terms recalculates the estimate for all recorded
              payments. For a rate reset, reconcile the opening balance instead
              of rewriting the loan’s historical rate.
            </Notice>
          ) : null}
          <button className="app-button-primary" type="submit">
            {editing ? "Save EMI changes" : "Save EMI"}
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
                  <p className="text-sm font-semibold">
                    Billed to:{" "}
                    {l.cardName || "Card not specified — edit to add one"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <p>
                      Estimated principal remaining
                      <br />
                      <strong>{formatCurrency(s.principal)}</strong>
                    </p>
                    <p>
                      Estimated unpaid interest
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
                    {l.interestRate}% annually · first tracked bill payment due{" "}
                    {l.firstDueDate} · estimates as of {localDate()}
                  </p>
                  {l.firstStatementDate && (
                    <p className="text-xs">
                      First tracked EMI statement: {l.firstStatementDate}
                    </p>
                  )}
                  <p className="text-xs">
                    {l.balanceBasis === "purchase"
                      ? "Purchase / booking"
                      : "Starting balance as of"}
                    : {l.startDate}
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
                          cardName: l.cardName ?? "",
                          balanceBasis: l.balanceBasis ?? "remaining",
                          firstStatementDate: l.firstStatementDate ?? "",
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
              No EMIs recorded. Add a purchase converted to EMI and the credit
              card it is billed to.
            </Empty>
          )}
        </div>
      </div>
      <h2 className="text-xl font-semibold">Recorded EMI payments</h2>
      <TransactionList
        rows={data.transactions.filter((t) => t.kind === "loan_payment")}
      />
    </AppShell>
  );
}
