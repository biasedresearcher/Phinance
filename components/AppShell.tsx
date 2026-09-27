"use client";
/* Full-document navigation deliberately uses cached HTML shells when offline. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { usePathname } from "next/navigation";
import { useFinanceData, toggleDemo } from "@/lib/use-finance-data";
import { PwaStatus } from "./PwaStatus";
const links = [
  ["/", "Overview"],
  ["/expenses", "Transactions"],
  ["/salary", "Salary"],
  ["/accounts", "Accounts"],
  ["/planner", "Plan"],
  ["/emi", "Card EMIs"],
  ["/investments", "Investments"],
  ["/settings", "Settings"],
];
export function AppShell({
  title,
  subtitle,
  children,
  compact = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const path = usePathname();
  const { ready, error, savedAt, demo, reload, data, setData } =
    useFinanceData();
  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div
          className={`mx-auto max-w-7xl px-4 md:px-6 ${compact ? "py-3" : "py-4"}`}
        >
          <div
            className={`flex flex-wrap items-center justify-between gap-3 ${compact ? "mb-2" : "mb-4"}`}
          >
            <a
              href="/"
              className="text-2xl font-bold text-[var(--accent-strong)]"
            >
              Phinance
              <span className="ml-3 text-xs font-normal text-[var(--muted-foreground)]">
                Make room for what matters.
              </span>
            </a>
            <span className="text-xs" role="status">
              {demo
                ? "Demo · changes stay in this session"
                : savedAt
                  ? `Saved on this device at ${new Date(savedAt).toLocaleTimeString()}`
                  : "Stored on this device · back up in Settings"}
            </span>
          </div>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-1">
            {links.map(([href, label]) => (
              <a
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
                className={`app-nav-link ${path === href ? "app-nav-link-active" : ""}`}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main
        id="main"
        className={`mx-auto max-w-7xl px-4 pb-24 md:px-6 ${compact ? "space-y-4 pt-4" : "space-y-5 pt-7"}`}
      >
        <PwaStatus />
        {demo ? (
          <div className="status-banner">
            Demo records only. Your personal records are unchanged.{" "}
            <button type="button" className="underline" onClick={toggleDemo}>
              Leave demo
            </button>
          </div>
        ) : null}
        {error ? (
          <div role="alert" className="error-banner">
            {error}{" "}
            <button className="underline" type="button" onClick={reload}>
              Reload saved records
            </button>{" "}
            ·{" "}
            <a className="underline" href="/settings">
              Recovery and backups
            </a>
          </div>
        ) : null}
        {ready && data.settings.legacyReview ? (
          <div className="status-banner">
            <p>
              Your old entries have been preserved. They may include sample
              records. Assign their accounts, review loan opening balances and
              investment valuations, then confirm below. No past EMI payments
              were invented.
            </p>
            <button
              type="button"
              className="app-button-secondary mt-2"
              onClick={() =>
                setData((d) => ({
                  ...d,
                  settings: { ...d.settings, legacyReview: false },
                }))
              }
            >
              I have reviewed the imported records
            </button>
          </div>
        ) : null}
        <div>
          <h1
            className={`font-bold ${compact ? "text-2xl sm:text-3xl" : "text-3xl"}`}
          >
            {title}
          </h1>
          <p
            className={`max-w-4xl text-[var(--muted-foreground)] ${compact ? "mt-1 text-sm" : "mt-2"}`}
          >
            {subtitle}
          </p>
        </div>
        {ready ? (
          children
        ) : (
          <p role="status" className="app-card p-8">
            Loading your records…
          </p>
        )}
      </main>
    </div>
  );
}
