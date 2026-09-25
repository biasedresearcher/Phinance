"use client";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { Field, Empty, Notice } from "@/components/finance/UI";
import { TransactionForm } from "@/components/finance/TransactionForm";
import { TransactionList } from "@/components/finance/TransactionList";
import { useFinanceData } from "@/lib/use-finance-data";
import { localDate, localMonth } from "@/lib/dates";
import { formatCurrency, sumMoney, money } from "@/lib/finance-utils";
import type { Investment } from "@/lib/types";
export default function InvestmentsPage() {
  const { data, setData } = useFinanceData();
  const [editing, setEditing] = useState<string>();
  const [contribute, setContribute] = useState<string>();
  const blank = () => ({
    name: "",
    type: "SIP" as Investment["type"],
    currentValue: "0",
    valuedOn: localDate(),
    units: "",
    sipAmount: "0",
    sipDay: "1",
    startMonth: localMonth(),
  });
  const [form, setForm] = useState(blank);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const record: Investment = {
      ...form,
      id: editing ?? crypto.randomUUID(),
      currentValue: Number(form.currentValue),
      units: form.units === "" ? undefined : Number(form.units),
      sipAmount: form.type === "SIP" ? Number(form.sipAmount) : 0,
      sipDay: Number(form.sipDay),
    };
    if (
      await setData((d) => ({
        ...d,
        investments: editing
          ? d.investments.map((i) => (i.id === editing ? record : i))
          : [...d.investments, record],
      }))
    ) {
      setEditing(undefined);
      setForm(blank());
    }
  };
  return (
    <AppShell
      title="Investments"
      subtitle="Keep contributions, recurring plans, and dated valuations separate."
    >
      <Notice>
        Values are entered manually; they are not live market prices. Creating
        an investment or changing its valuation does not move cash. Record a
        contribution when money actually leaves your account. Pausing a SIP
        means setting its planned amount to zero.
      </Notice>
      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <form onSubmit={submit} className="app-card space-y-4 p-5">
          <h2 className="text-xl font-semibold">
            {editing ? "Update investment" : "Add investment"}
          </h2>
          <Field label="Investment / fund name">
            <input
              className="app-input"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Contribution method">
            <select
              className="app-input"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as Investment["type"],
                }))
              }
            >
              <option>SIP</option>
              <option>Lump Sum</option>
            </select>
          </Field>
          <Field label="Current value (₹)">
            <input
              className="app-input"
              required
              type="number"
              min="0"
              step="0.01"
              value={form.currentValue}
              onChange={(e) =>
                setForm((f) => ({ ...f, currentValue: e.target.value }))
              }
            />
          </Field>
          <Field label="Valuation date">
            <input
              className="app-input"
              required
              type="date"
              max={localDate()}
              value={form.valuedOn}
              onChange={(e) =>
                setForm((f) => ({ ...f, valuedOn: e.target.value }))
              }
            />
          </Field>
          <Field label="Units held (optional)">
            <input
              className="app-input"
              type="number"
              min="0"
              step="any"
              value={form.units}
              onChange={(e) =>
                setForm((f) => ({ ...f, units: e.target.value }))
              }
            />
          </Field>
          {form.type === "SIP" ? (
            <>
              <Field label="Planned monthly contribution (₹)">
                <input
                  className="app-input"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.sipAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sipAmount: e.target.value }))
                  }
                />
              </Field>
              <Field label="Contribution day">
                <input
                  className="app-input"
                  type="number"
                  required
                  min="1"
                  max="31"
                  value={form.sipDay}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sipDay: e.target.value }))
                  }
                />
              </Field>
              <Field label="Schedule starts">
                <input
                  className="app-input"
                  type="month"
                  required
                  value={form.startMonth}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startMonth: e.target.value }))
                  }
                />
              </Field>
            </>
          ) : null}
          <button className="app-button-primary" type="submit">
            {editing ? "Save investment changes" : "Save investment"}
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
        <div className="space-y-4">
          {data.investments.length ? (
            data.investments.map((i) => {
              const rows = data.transactions.filter(
                (t) => t.investmentId === i.id && t.date <= localDate(),
              );
              const invested = sumMoney(rows.map((t) => t.amount));
              const atValuation = sumMoney(
                rows
                  .filter((t) => i.valuedOn && t.date <= i.valuedOn)
                  .map((t) => t.amount),
              );
              return (
                <article key={i.id} className="app-card space-y-3 p-5">
                  <h2 className="text-xl font-semibold">{i.name}</h2>
                  <p>
                    {i.type}{" "}
                    {i.sipAmount > 0
                      ? `· planned ${formatCurrency(i.sipAmount)} monthly on day ${i.sipDay}`
                      : ""}
                  </p>
                  <p>
                    Recorded contributions:{" "}
                    <strong>{formatCurrency(invested)}</strong>
                  </p>
                  <p>
                    Value: <strong>{formatCurrency(i.currentValue)}</strong> ·{" "}
                    {i.valuedOn || "Valuation date needs review"}
                  </p>
                  {i.valuedOn ? (
                    <p>
                      Change versus recorded contributions through valuation
                      date:{" "}
                      <strong>
                        {formatCurrency(money(i.currentValue - atValuation))}
                      </strong>
                    </p>
                  ) : null}
                  <p className="text-xs">
                    Only meaningful if all contributions through the valuation
                    date are recorded.
                    {i.units !== undefined ? ` Units held: ${i.units}.` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="app-button-secondary"
                      type="button"
                      onClick={() =>
                        setContribute(contribute === i.id ? undefined : i.id)
                      }
                    >
                      Record contribution
                    </button>
                    <button
                      className="app-button-secondary"
                      type="button"
                      onClick={() => {
                        setEditing(i.id);
                        setForm({
                          ...i,
                          currentValue: String(i.currentValue),
                          units: i.units === undefined ? "" : String(i.units),
                          sipAmount: String(i.sipAmount),
                          sipDay: String(i.sipDay),
                        });
                      }}
                    >
                      Edit / value
                    </button>
                    <button
                      className="app-button-danger"
                      type="button"
                      disabled={rows.length > 0}
                      title="Remove linked contributions before deleting an investment"
                      onClick={() => {
                        if (confirm(`Delete ${i.name}?`))
                          void setData((d) => ({
                            ...d,
                            investments: d.investments.filter(
                              (x) => x.id !== i.id,
                            ),
                          }));
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  {contribute === i.id ? (
                    <TransactionForm
                      key={i.id}
                      fixedKind="investment"
                      defaults={{ investmentId: i.id, amount: i.sipAmount }}
                      onDone={() => setContribute(undefined)}
                    />
                  ) : null}
                </article>
              );
            })
          ) : (
            <Empty>No investments recorded yet.</Empty>
          )}
        </div>
      </div>
      <h2 className="text-xl font-semibold">Contribution history</h2>
      <TransactionList
        rows={data.transactions.filter((t) => t.kind === "investment")}
      />
    </AppShell>
  );
}
