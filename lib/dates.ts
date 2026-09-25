export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export const localMonth = (date = new Date()) => localDate(date).slice(0, 7);
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  return (
    year >= 1900 &&
    year <= 2200 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= new Date(year, month, 0).getDate()
  );
}
export function validMonth(value: unknown): value is string {
  return typeof value === "string" && validDate(`${value}-01`);
}
export function monthDate(month: string, day: number): string {
  const [year, m] = month.split("-").map(Number);
  return `${month}-${String(Math.min(day, new Date(year, m, 0).getDate())).padStart(2, "0")}`;
}
export function shiftMonth(month: string, offset: number): string {
  const [year, m] = month.split("-").map(Number);
  return localDate(new Date(year, m - 1 + offset, 1, 12)).slice(0, 7);
}
export function addMonths(
  date: string,
  months: number,
  anchorDay = Number(date.slice(8)),
): string {
  return monthDate(shiftMonth(date.slice(0, 7), months), anchorDay);
}
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) /
      86400000,
  );
}
export function nextPayday(today: string, day: number): string {
  const candidate = monthDate(today.slice(0, 7), day);
  return candidate > today
    ? candidate
    : monthDate(shiftMonth(today.slice(0, 7), 1), day);
}
export function salaryCycle(today: string, day: number) {
  const current = monthDate(today.slice(0, 7), day);
  return {
    start:
      current <= today
        ? current
        : monthDate(shiftMonth(today.slice(0, 7), -1), day),
    end: nextPayday(today, day),
  };
}
