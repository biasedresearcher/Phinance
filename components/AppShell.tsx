"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/emi", label: "EMI Tracker" },
  { href: "/investments", label: "Investments" },
  { href: "/salary", label: "Salary" },
];

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xl font-semibold">Phinance</p>
            <p className="text-sm text-slate-500">Personal finance PWA starter</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-slate-600">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
