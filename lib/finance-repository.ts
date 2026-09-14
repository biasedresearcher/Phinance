import { supabase } from "@/lib/supabase";
import {
  EmiEntry,
  ExpenseEntry,
  InvestmentEntry,
  InvestmentType,
  SalaryEntry,
} from "@/lib/types";

export interface FinanceData {
  expenses: ExpenseEntry[];
  emi: EmiEntry[];
  investments: InvestmentEntry[];
  salary: SalaryEntry[];
}

type ExpenseRow = {
  id: string;
  amount: number | string;
  category: ExpenseEntry["category"];
  date: string;
  note: string;
};

type EmiRow = {
  id: string;
  amount: number | string;
  monthly_installment: number | string;
  interest_rate: number | string;
  start_date: string;
};

type InvestmentRow = {
  id: string;
  type: InvestmentType;
  amount: number | string;
  current_value: number | string;
  date: string;
};

type SalaryRow = {
  id: string;
  month: string;
  amount: number | string;
  credited_on: string;
};

const toNumber = (value: number | string) => Number(value);

const mapExpense = (row: ExpenseRow): ExpenseEntry => ({
  id: row.id,
  amount: toNumber(row.amount),
  category: row.category,
  date: row.date,
  note: row.note ?? "",
});

const mapEmi = (row: EmiRow): EmiEntry => ({
  id: row.id,
  amount: toNumber(row.amount),
  monthlyInstallment: toNumber(row.monthly_installment),
  interestRate: toNumber(row.interest_rate),
  startDate: row.start_date,
});

const mapInvestment = (row: InvestmentRow): InvestmentEntry => ({
  id: row.id,
  type: row.type,
  amount: toNumber(row.amount),
  currentValue: toNumber(row.current_value),
  date: row.date,
});

const mapSalary = (row: SalaryRow): SalaryEntry => ({
  id: row.id,
  month: row.month,
  amount: toNumber(row.amount),
  creditedOn: row.credited_on,
});

const throwIfError = (error: Error | null) => {
  if (error) {
    throw error;
  }
};

export const getEmptyFinanceData = (): FinanceData => ({
  expenses: [],
  emi: [],
  investments: [],
  salary: [],
});

export const listFinanceData = async (): Promise<FinanceData> => {
  const [expensesResult, emiResult, investmentsResult, salaryResult] = await Promise.all([
    supabase.from("expenses").select("id, amount, category, date, note").order("date", { ascending: false }),
    supabase
      .from("emi")
      .select("id, amount, monthly_installment, interest_rate, start_date")
      .order("start_date", { ascending: false }),
    supabase
      .from("investments")
      .select("id, type, amount, current_value, date")
      .order("date", { ascending: false }),
    supabase
      .from("salary")
      .select("id, month, amount, credited_on")
      .order("credited_on", { ascending: false }),
  ]);

  throwIfError(expensesResult.error);
  throwIfError(emiResult.error);
  throwIfError(investmentsResult.error);
  throwIfError(salaryResult.error);

  return {
    expenses: ((expensesResult.data ?? []) as ExpenseRow[]).map(mapExpense),
    emi: ((emiResult.data ?? []) as EmiRow[]).map(mapEmi),
    investments: ((investmentsResult.data ?? []) as InvestmentRow[]).map(mapInvestment),
    salary: ((salaryResult.data ?? []) as SalaryRow[]).map(mapSalary),
  };
};

export const createExpense = async (
  userId: string,
  entry: Omit<ExpenseEntry, "id">,
): Promise<ExpenseEntry> => {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      user_id: userId,
      amount: entry.amount,
      category: entry.category,
      date: entry.date,
      note: entry.note,
    })
    .select("id, amount, category, date, note")
    .single();

  throwIfError(error);
  return mapExpense(data as ExpenseRow);
};

export const updateExpense = async (
  id: string,
  entry: Omit<ExpenseEntry, "id">,
): Promise<ExpenseEntry> => {
  const { data, error } = await supabase
    .from("expenses")
    .update({
      amount: entry.amount,
      category: entry.category,
      date: entry.date,
      note: entry.note,
    })
    .eq("id", id)
    .select("id, amount, category, date, note")
    .single();

  throwIfError(error);
  return mapExpense(data as ExpenseRow);
};

export const deleteExpense = async (id: string) => {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  throwIfError(error);
};

export const createEmi = async (
  userId: string,
  entry: Omit<EmiEntry, "id">,
): Promise<EmiEntry> => {
  const { data, error } = await supabase
    .from("emi")
    .insert({
      user_id: userId,
      amount: entry.amount,
      monthly_installment: entry.monthlyInstallment,
      interest_rate: entry.interestRate,
      start_date: entry.startDate,
    })
    .select("id, amount, monthly_installment, interest_rate, start_date")
    .single();

  throwIfError(error);
  return mapEmi(data as EmiRow);
};

export const updateEmi = async (
  id: string,
  entry: Omit<EmiEntry, "id">,
): Promise<EmiEntry> => {
  const { data, error } = await supabase
    .from("emi")
    .update({
      amount: entry.amount,
      monthly_installment: entry.monthlyInstallment,
      interest_rate: entry.interestRate,
      start_date: entry.startDate,
    })
    .eq("id", id)
    .select("id, amount, monthly_installment, interest_rate, start_date")
    .single();

  throwIfError(error);
  return mapEmi(data as EmiRow);
};

export const deleteEmi = async (id: string) => {
  const { error } = await supabase.from("emi").delete().eq("id", id);
  throwIfError(error);
};

export const createInvestment = async (
  userId: string,
  entry: Omit<InvestmentEntry, "id">,
): Promise<InvestmentEntry> => {
  const { data, error } = await supabase
    .from("investments")
    .insert({
      user_id: userId,
      type: entry.type,
      amount: entry.amount,
      current_value: entry.currentValue,
      date: entry.date,
    })
    .select("id, type, amount, current_value, date")
    .single();

  throwIfError(error);
  return mapInvestment(data as InvestmentRow);
};

export const updateInvestment = async (
  id: string,
  entry: Omit<InvestmentEntry, "id">,
): Promise<InvestmentEntry> => {
  const { data, error } = await supabase
    .from("investments")
    .update({
      type: entry.type,
      amount: entry.amount,
      current_value: entry.currentValue,
      date: entry.date,
    })
    .eq("id", id)
    .select("id, type, amount, current_value, date")
    .single();

  throwIfError(error);
  return mapInvestment(data as InvestmentRow);
};

export const deleteInvestment = async (id: string) => {
  const { error } = await supabase.from("investments").delete().eq("id", id);
  throwIfError(error);
};

export const createSalary = async (
  userId: string,
  entry: Omit<SalaryEntry, "id">,
): Promise<SalaryEntry> => {
  const { data, error } = await supabase
    .from("salary")
    .insert({
      user_id: userId,
      month: entry.month,
      amount: entry.amount,
      credited_on: entry.creditedOn,
    })
    .select("id, month, amount, credited_on")
    .single();

  throwIfError(error);
  return mapSalary(data as SalaryRow);
};

export const updateSalary = async (
  id: string,
  entry: Omit<SalaryEntry, "id">,
): Promise<SalaryEntry> => {
  const { data, error } = await supabase
    .from("salary")
    .update({
      month: entry.month,
      amount: entry.amount,
      credited_on: entry.creditedOn,
    })
    .eq("id", id)
    .select("id, month, amount, credited_on")
    .single();

  throwIfError(error);
  return mapSalary(data as SalaryRow);
};

export const deleteSalary = async (id: string) => {
  const { error } = await supabase.from("salary").delete().eq("id", id);
  throwIfError(error);
};
