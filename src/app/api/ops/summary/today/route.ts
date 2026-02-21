import { NextResponse } from "next/server";
import { getTodaySummary } from "@/lib/ops-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getTodaySummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("ops/summary/today failed", error);
    return NextResponse.json({ error: "Failed to read today summary" }, { status: 500 });
  }
}
