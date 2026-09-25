"use client";
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { formatCurrency } from "@/lib/finance-utils";
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5 text-sm font-medium">
      <label htmlFor={id} className="block">
        {label}
      </label>
      {Children.map(children, (child) =>
        isValidElement<HTMLAttributes<HTMLElement>>(child) &&
        typeof child.type === "string" &&
        ["input", "select", "textarea"].includes(child.type)
          ? cloneElement(child, {
              id,
              "aria-describedby": hint ? `${id}-hint` : undefined,
            })
          : child,
      )}
      {hint ? (
        <p
          id={`${id}-hint`}
          className="text-xs font-normal text-[var(--muted-foreground)]"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted-foreground)]">
      {children}
    </p>
  );
}
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="app-card p-5">
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${value < 0 ? "text-[var(--danger)]" : ""}`}
      >
        {formatCurrency(value)}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm">
      {children}
    </div>
  );
}
