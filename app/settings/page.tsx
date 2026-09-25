"use client";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CloudSync } from "@/components/CloudSync";
import { Field, Notice } from "@/components/finance/UI";
import { demoData, emptyData, parseBackup } from "@/lib/finance-repository";
import {
  downloadText,
  exportData,
  lastGoodBackup,
  rawRecovery,
  replaceData,
  toggleDemo,
  useFinanceData,
} from "@/lib/use-finance-data";
import type { FinanceData } from "@/lib/types";
export default function SettingsPage() {
  const { data, setData, demo, recoveryRaw } = useFinanceData();
  const [category, setCategory] = useState("");
  const [candidate, setCandidate] = useState<FinanceData>();
  const [message, setMessage] = useState("");
  const inspect = (raw: string) => {
    try {
      setCandidate(parseBackup(raw));
      setMessage(
        "Backup validated. Review the record counts before replacing anything.",
      );
    } catch (e) {
      setCandidate(undefined);
      setMessage(e instanceof Error ? e.message : "Invalid backup.");
    }
  };
  return (
    <AppShell
      title="Settings & backups"
      subtitle="Keep recoverable copies of your records and control where they are stored."
    >
      <section className="app-card space-y-4 p-5">
        <h2 className="text-xl font-semibold">Back up and restore</h2>
        <Notice>
          Device storage can be cleared by your browser. Export a backup
          regularly and before changing phones. Backups contain your financial
          records; store them somewhere private.
        </Notice>
        <div className="flex flex-wrap gap-3">
          <button
            className="app-button-secondary"
            type="button"
            onClick={exportData}
          >
            Export JSON backup
          </button>
          <button
            className="app-button-secondary"
            type="button"
            onClick={() => {
              const raw = lastGoodBackup();
              if (raw) inspect(raw);
              else
                setMessage(
                  "No last-good copy is available yet. It is created when existing saved records are updated.",
                );
            }}
          >
            Inspect last-good copy
          </button>
          {recoveryRaw !== null ? (
            <button
              className="app-button-secondary"
              type="button"
              onClick={() => {
                const raw = rawRecovery();
                if (raw !== null)
                  downloadText(
                    "phinance-original-recovery.txt",
                    raw,
                    "text/plain",
                  );
              }}
            >
              Download unreadable original
            </button>
          ) : null}
        </div>
        <Field label="Choose a backup to inspect">
          <input
            className="app-input"
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 5_000_000) {
                setMessage("The backup exceeds the 5 MB limit.");
                setCandidate(undefined);
                return;
              }
              inspect(await file.text());
              e.target.value = "";
            }}
          />
        </Field>
        {message ? (
          <p role="status" className="text-sm">
            {message}
          </p>
        ) : null}
        {candidate ? (
          <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
            <p>
              <strong>Restore preview:</strong> {candidate.accounts.length}{" "}
              accounts, {candidate.transactions.length} transactions,{" "}
              {candidate.loans.length} loans, {candidate.investments.length}{" "}
              investments, {candidate.bills.length} bill schedules and{" "}
              {candidate.budgets.length} budgets.
            </p>
            <p className="text-sm">
              This replaces the current records; it does not merge them.
            </p>
            <button
              className="app-button-primary"
              type="button"
              onClick={async () => {
                if (
                  confirm(
                    "Replace this device’s records with this inspected backup? Your current readable records will first be exported.",
                  )
                ) {
                  exportData();
                  if (await replaceData(candidate)) {
                    setCandidate(undefined);
                    setMessage("Backup restored successfully.");
                  }
                }
              }}
            >
              Export current records & restore
            </button>
            <button
              className="app-button-secondary"
              type="button"
              onClick={() => setCandidate(undefined)}
            >
              Cancel
            </button>
          </div>
        ) : null}
        {recoveryRaw !== null ? (
          <button
            className="app-button-danger"
            type="button"
            onClick={async () => {
              if (
                confirm(
                  "Start with empty records? The unreadable original will be downloaded and retained separately on this device.",
                )
              ) {
                downloadText(
                  "phinance-original-recovery.txt",
                  recoveryRaw,
                  "text/plain",
                );
                if (await replaceData(emptyData()))
                  setMessage("Empty records created. Keep your recovery file.");
              }
            }}
          >
            Preserve original & start empty
          </button>
        ) : null}
      </section>
      <CloudSync />
      <section className="app-card space-y-4 p-5">
        <h2 className="text-xl font-semibold">Expense categories</h2>
        <div className="flex flex-wrap gap-2">
          {data.categories.map((c) => (
            <span
              className="rounded-full border border-[var(--border)] px-3 py-1 text-sm"
              key={c}
            >
              {c}
            </span>
          ))}
        </div>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const value = category.trim();
            if (
              value &&
              (await setData((d) => ({
                ...d,
                categories: [...d.categories, value],
              })))
            )
              setCategory("");
          }}
        >
          <Field label="New category">
            <input
              className="app-input"
              required
              maxLength={80}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </Field>
          <button className="app-button-secondary" type="submit">
            Add category
          </button>
        </form>
      </section>
      <section className="app-card space-y-4 p-5">
        <h2 className="text-xl font-semibold">Try demo records</h2>
        <p className="text-sm">
          Demo records are separate from your finances. They stay only in this
          browser tab’s session.
        </p>
        <button
          className="app-button-secondary"
          type="button"
          onClick={toggleDemo}
        >
          {demo ? "Leave demo" : "Open demo mode"}
        </button>
        {demo ? (
          <button
            className="app-button-secondary ml-2"
            type="button"
            onClick={() => void setData(demoData())}
          >
            Reset demo
          </button>
        ) : null}
      </section>
    </AppShell>
  );
}
