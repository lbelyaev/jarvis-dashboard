import { NextRequest, NextResponse } from "next/server";
import { getOpsEvents } from "@/lib/ops-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const events = await getOpsEvents(searchParams.get("limit"), searchParams.get("since"));
    return NextResponse.json({ events, count: events.length });
  } catch (error) {
    console.error("ops/events failed", error);
    return NextResponse.json({ error: "Failed to read ops events" }, { status: 500 });
  }
}
