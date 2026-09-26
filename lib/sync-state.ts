import type { FinanceData } from "./types";
import { emptyData, validateData } from "./finance-repository";
export interface CloudCopy {
  data: FinanceData;
  revision: number;
}
export const syncKey = (userId: string) => `phinance-auto-sync:${userId}`;
export const OWNER_KEY = "phinance-sync-owner";
export function sameData(a: FinanceData, b: FinanceData) {
  const stable = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(stable)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, stable(v)]),
          )
        : value;
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}
export function parseCopy(raw: string | null): CloudCopy | null {
  if (raw === null) return null;
  const value = JSON.parse(raw);
  if (!Number.isSafeInteger(value.revision) || value.revision < 1)
    throw new Error(
      "Invalid sync history. Export your records before recovery.",
    );
  return { revision: value.revision, data: validateData(value.data) };
}
export function decideSync(
  local: FinanceData,
  remote: CloudCopy | null,
  base: CloudCopy | null,
  legacyRevision: number | null,
): "adopt" | "upload" | "download" | "conflict" {
  if (remote && sameData(local, remote.data)) return "adopt";
  if (!remote) return base || legacyRevision !== null ? "conflict" : "upload";
  if (!base) {
    if (sameData(local, emptyData())) return "download";
    if (legacyRevision === remote.revision) return "upload";
    return "conflict";
  }
  if (remote.revision < base.revision) return "conflict";
  if (sameData(local, base.data)) return "download";
  if (sameData(remote.data, base.data)) return "upload";
  return "conflict";
}
