import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/finance-utils";
import { getFinanceRepository } from "@/lib/finance-repository";

export default function SalaryPage() {
  const repository = getFinanceRepository();
  const salaries = repository.listSalaries();

  return (
    <AppShell title="Salary" subtitle="Monthly salary entries.">
      <div className="app-card overflow-auto p-5">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-3 font-medium">Month</th>
              <th className="pb-3 font-medium">Credited On</th>
              <th className="pb-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((entry) => (
              <tr className="border-t border-slate-200/80" key={entry.id}>
                <td className="py-3">{entry.month}</td>
                <td className="py-3">{entry.creditedOn}</td>
                <td className="py-3 text-right font-medium">{formatCurrency(entry.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
