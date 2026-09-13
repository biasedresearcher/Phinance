import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/finance-utils";
import { getFinanceRepository } from "@/lib/finance-repository";

export default function SalaryPage() {
  const repository = getFinanceRepository();
  const salaries = repository.listSalaries();

  return (
    <AppShell title="Salary" subtitle="Monthly salary entries.">
      <div className="overflow-auto rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-2">Month</th>
              <th className="pb-2">Credited On</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((entry) => (
              <tr className="border-t border-slate-200" key={entry.id}>
                <td className="py-2">{entry.month}</td>
                <td className="py-2">{entry.creditedOn}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(entry.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
