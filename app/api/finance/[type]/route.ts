import { NextRequest, NextResponse } from "next/server";
import {
  createExpense,
  updateExpense,
  deleteExpense,
  createEmi,
  updateEmi,
  deleteEmi,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  createSalary,
  updateSalary,
  deleteSalary,
  listFinanceData,
} from "@/lib/finance-repository";
import { EmiEntry, ExpenseEntry, InvestmentEntry, SalaryEntry } from "@/lib/types";

const USER_ID = "demo-user-1";

type Params = { type: string };

export async function POST(
  request: NextRequest,
  { params }: { params: Params },
) {
  const { type } = await params;
  const body = await request.json();

  try {
    switch (type) {
      case "expenses": {
        const entry = body as Omit<ExpenseEntry, "id">;
        const created = await createExpense(USER_ID, entry);
        return NextResponse.json(created);
      }
      case "emi": {
        const entry = body as Omit<EmiEntry, "id">;
        const created = await createEmi(USER_ID, entry);
        return NextResponse.json(created);
      }
      case "investments": {
        const entry = body as Omit<InvestmentEntry, "id">;
        const created = await createInvestment(USER_ID, entry);
        return NextResponse.json(created);
      }
      case "salary": {
        const entry = body as Omit<SalaryEntry, "id">;
        const created = await createSalary(USER_ID, entry);
        return NextResponse.json(created);
      }
      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }
  } catch (error) {
    console.error(`Failed to create ${type}:`, error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params },
) {
  const { type } = await params;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const body = await request.json();

  try {
    switch (type) {
      case "expenses": {
        const entry = body as Omit<ExpenseEntry, "id">;
        const updated = await updateExpense(id, entry);
        return NextResponse.json(updated);
      }
      case "emi": {
        const entry = body as Omit<EmiEntry, "id">;
        const updated = await updateEmi(id, entry);
        return NextResponse.json(updated);
      }
      case "investments": {
        const entry = body as Omit<InvestmentEntry, "id">;
        const updated = await updateInvestment(id, entry);
        return NextResponse.json(updated);
      }
      case "salary": {
        const entry = body as Omit<SalaryEntry, "id">;
        const updated = await updateSalary(id, entry);
        return NextResponse.json(updated);
      }
      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }
  } catch (error) {
    console.error(`Failed to update ${type}:`, error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params },
) {
  const { type } = await params;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    switch (type) {
      case "expenses":
        await deleteExpense(id);
        break;
      case "emi":
        await deleteEmi(id);
        break;
      case "investments":
        await deleteInvestment(id);
        break;
      case "salary":
        await deleteSalary(id);
        break;
      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`Failed to delete ${type}:`, error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
