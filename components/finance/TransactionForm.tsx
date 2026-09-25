"use client";
import { useState, type FormEvent } from "react";
import type { Transaction, TransactionKind } from "@/lib/types";
import { localDate, localMonth } from "@/lib/dates";
import { useFinanceData } from "@/lib/use-finance-data";
import { kindLabel, loanStatus } from "@/lib/finance-utils";
import { Field, Notice } from "./UI";
export function TransactionForm({
  entry,
  defaults = {},
  fixedKind,
  onDone,
}: {
  entry?: Transaction;
  defaults?: Partial<Transaction>;
  fixedKind?: TransactionKind;
  onDone?: () => void;
}) {
  const { data, setData } = useFinanceData();
  const [form, setForm] = useState(() => ({
    kind: entry?.kind ?? fixedKind ?? defaults.kind ?? "expense",
    amount: entry
      ? String(entry.amount)
      : defaults.amount
        ? String(defaults.amount)
        : "",
    date: entry?.date ?? defaults.date ?? localDate(),
    accountId:
      entry?.accountId ?? defaults.accountId ?? data.accounts[0]?.id ?? "",
    toAccountId: entry?.toAccountId ?? "",
    category:
      entry?.category ??
      defaults.category ??
      (fixedKind === "income" ? "Salary" : data.categories[0]),
    note: entry?.note ?? defaults.note ?? "",
    salaryMonth: entry?.salaryMonth ?? localMonth(),
    loanId: entry?.loanId ?? defaults.loanId ?? data.loans[0]?.id ?? "",
    investmentId:
      entry?.investmentId ??
      defaults.investmentId ??
      data.investments[0]?.id ??
      "",
    billId: entry?.billId ?? defaults.billId ?? "",
    occurrence: entry?.occurrence ?? defaults.occurrence ?? "",
  }));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const patch = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (!form.accountId) {
      setError("Choose an account first.");
      return;
    }
    if (form.date > localDate()) {
      setError(
        "Record money only after it moves. Use Plan for future commitments.",
      );
      return;
    }
    const amount = Number(form.amount);
    const value: Transaction = {
      id: entry?.id ?? crypto.randomUUID(),
      kind: form.kind,
      amount,
      date: form.date,
      accountId: form.accountId,
      category:
        form.kind === "income"
          ? form.category
          : form.kind === "expense"
            ? form.category
            : kindLabel[form.kind],
      note: form.note,
      ...(form.kind === "transfer" ? { toAccountId: form.toAccountId } : {}),
      ...(form.kind === "income" && form.category === "Salary"
        ? { salaryMonth: form.salaryMonth }
        : {}),
      ...(form.kind === "investment"
        ? { investmentId: form.investmentId }
        : {}),
      ...(form.kind === "loan_payment" ? { loanId: form.loanId } : {}),
      ...(form.kind === "expense" && form.billId
        ? { billId: form.billId }
        : {}),
      ...((form.kind === "loan_payment" ||
        (form.kind === "expense" && form.billId)) &&
      form.occurrence
        ? { occurrence: form.occurrence }
        : {}),
    };
    if (form.kind === "loan_payment") {
      const loan = data.loans.find((l) => l.id === form.loanId);
      if (loan) {
        const remaining = loanStatus(
          loan,
          data.transactions.filter((t) => t.id !== entry?.id),
          form.date,
        ).outstanding;
        if (amount > remaining + 0.005) {
          setError(
            "This payment exceeds the estimated outstanding balance. Check the loan terms and payment date.",
          );
          return;
        }
      }
    }
    setBusy(true);
    const ok = await setData((d) => {
      if (
        entry &&
        JSON.stringify(d.transactions.find((t) => t.id === entry.id)) !==
          JSON.stringify(entry)
      ) {
        throw new Error(
          "This transaction changed since you opened it. Cancel editing and open the latest record.",
        );
      }
      return {
        ...d,
        transactions: entry
          ? d.transactions.map((t) => (t.id === entry.id ? value : t))
          : [value, ...d.transactions],
      };
    });
    setBusy(false);
    if (ok) {
      setSaved(true);
      if (!entry) setForm((f) => ({ ...f, amount: "", note: "" }));
      onDone?.();
    }
  };
  return (
    <form className="app-card space-y-4 p-5" onSubmit={submit}>
      <h2 className="text-xl font-semibold">
        {entry ? "Edit transaction" : "Record a payment"}
      </h2>
      {!data.accounts.length ? (
        <Notice>
          <a href="/accounts" className="underline">
            Add your first account
          </a>{" "}
          with its opening balance before recording money.
        </Notice>
      ) : null}
      {!fixedKind ? (
        <Field label="Type">
          <select
            className="app-input"
            value={form.kind}
            onChange={(e) => patch("kind", e.target.value)}
          >
            {Object.entries(kindLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount (₹)">
          <input
            className="app-input"
            inputMode="decimal"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => patch("amount", e.target.value)}
          />
        </Field>
        <Field label="Date money moved">
          <input
            className="app-input"
            type="date"
            required
            max={localDate()}
            value={form.date}
            onChange={(e) => patch("date", e.target.value)}
          />
        </Field>
      </div>
      <Field label={form.kind === "income" ? "Received into" : "Paid from"}>
        <select
          className="app-input"
          required
          value={form.accountId}
          onChange={(e) => patch("accountId", e.target.value)}
        >
          <option value="">Choose account</option>
          {data.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      {form.kind === "transfer" ? (
        <Field label="Transfer to">
          <select
            className="app-input"
            required
            value={form.toAccountId}
            onChange={(e) => patch("toAccountId", e.target.value)}
          >
            <option value="">Choose another account</option>
            {data.accounts
              .filter((a) => a.id !== form.accountId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </Field>
      ) : null}
      {form.kind === "expense" ? (
        <>
          <Field label="Category">
            <select
              className="app-input"
              value={form.category}
              onChange={(e) => patch("category", e.target.value)}
            >
              {Array.from(new Set([...data.categories, form.category])).map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </Field>
          <Field label="Recurring bill (optional)">
            <select
              className="app-input"
              value={form.billId}
              onChange={(e) => patch("billId", e.target.value)}
            >
              <option value="">Not a recurring bill</option>
              {data.bills.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        </>
      ) : null}
      {form.kind === "income" ? (
        <>
          <Field label="Income category">
            <input
              className="app-input"
              list="income-categories"
              required
              value={form.category}
              onChange={(e) => patch("category", e.target.value)}
            />
            <datalist id="income-categories">
              <option value="Salary" />
              <option value="Other income" />
            </datalist>
          </Field>
          {form.category === "Salary" ? (
            <Field
              label="Salary earned for"
              hint="Cash flow follows the actual credit date."
            >
              <input
                className="app-input"
                type="month"
                required
                value={form.salaryMonth}
                onChange={(e) => patch("salaryMonth", e.target.value)}
              />
            </Field>
          ) : null}
        </>
      ) : null}
      {form.kind === "loan_payment" ? (
        <Field label="Loan">
          <select
            className="app-input"
            required
            value={form.loanId}
            onChange={(e) => patch("loanId", e.target.value)}
          >
            <option value="">Choose loan</option>
            {data.loans.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {form.kind === "investment" ? (
        <Field label="Investment">
          <select
            className="app-input"
            required
            value={form.investmentId}
            onChange={(e) => patch("investmentId", e.target.value)}
          >
            <option value="">Choose investment</option>
            {data.investments.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {form.kind === "loan_payment" ||
      (form.kind === "expense" && form.billId) ? (
        <Field
          label="Scheduled due date"
          hint="Match the due date to clear that commitment. For an extra loan prepayment, leave this blank."
        >
          <input
            className="app-input"
            type="date"
            required={form.kind === "expense" && !!form.billId}
            value={form.occurrence}
            onChange={(e) => patch("occurrence", e.target.value)}
          />
        </Field>
      ) : null}
      <Field label="Note">
        <input
          className="app-input"
          maxLength={1000}
          value={form.note}
          onChange={(e) => patch("note", e.target.value)}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {saved ? <p role="status">Saved.</p> : null}
      <button
        type="submit"
        disabled={busy || !data.accounts.length}
        className="app-button-primary"
      >
        {busy ? "Saving…" : entry ? "Save changes" : "Save transaction"}
      </button>
      {entry ? (
        <button className="app-button-secondary" type="button" onClick={onDone}>
          Cancel edit
        </button>
      ) : null}
    </form>
  );
}
