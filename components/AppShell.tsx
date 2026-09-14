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
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight text-indigo-700">Phinance</p>
            <p className="text-sm text-slate-500">Personal finance workspace</p>
          </div>
          <nav className="flex flex-wrap gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  className={`app-nav-link ${isActive ? "app-nav-link-active" : ""}`}
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

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="max-w-3xl text-base text-slate-600">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
