import { NextRequest, NextResponse } from "next/server";
import { getAgentRuns } from "@/lib/ops-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const runs = await getAgentRuns(searchParams.get("limit"));
    return NextResponse.json({ runs, count: runs.length });
  } catch (error) {
    console.error("ops/agent-runs failed", error);
    return NextResponse.json({ error: "Failed to read agent runs" }, { status: 500 });
  }
}
