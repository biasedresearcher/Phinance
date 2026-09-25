"use client";
import { AppShell } from "@/components/AppShell";
import { TransactionForm } from "@/components/finance/TransactionForm";
import { TransactionList } from "@/components/finance/TransactionList";
import { useFinanceData } from "@/lib/use-finance-data";
export default function SalaryPage() {
  const { data } = useFinanceData();
  return (
    <AppShell
      title="Salary & income"
      subtitle="Record the net amount actually credited. Your planned salary stays separate until you receive it."
    >
      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <TransactionForm fixedKind="income" />
        <div className="min-w-0">
          <TransactionList
            rows={data.transactions.filter((t) => t.kind === "income")}
          />
        </div>
      </div>
    </AppShell>
  );
}
