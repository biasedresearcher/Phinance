import { NextRequest, NextResponse } from "next/server";
import { getEmptyFinanceData, listFinanceData } from "@/lib/finance-repository";

export async function GET(request: NextRequest) {
  try {
    const data = await listFinanceData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to list finance data:", error);
    return NextResponse.json(getEmptyFinanceData());
  }
}
