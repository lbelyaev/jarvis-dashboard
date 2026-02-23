import { NextRequest, NextResponse } from "next/server";
import { getAgentRuns, getAgentRunsForMission, getMissions } from "@/lib/ops-db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const missionId = searchParams.get("mission_id");
    const status = searchParams.get("status");
    const model = searchParams.get("model");

    // If mission_id specified, get runs for that mission
    let runs;
    if (missionId) {
      runs = await getAgentRunsForMission(parseInt(missionId));
    } else {
      runs = await getAgentRuns("100"); // Get last 100 runs
    }

    // Apply filters in memory (since SQLite query is already done)
    if (status) {
      runs = runs.filter((r) => r.status === status);
    }
    if (model) {
      runs = runs.filter((r) => r.model === model);
    }

    // Fetch mission details for any runs with mission_id
    const missionIds = [...new Set(runs.map((r) => r.mission_id).filter(Boolean))];
    const missionsList = await getMissions({});
    const missionsMap: Record<number, { id: number; title: string; project: string | null }> = {};
    
    missionsList.forEach((m) => {
      if (missionIds.includes(m.id)) {
        missionsMap[m.id] = {
          id: m.id,
          title: m.title,
          project: m.project,
        };
      }
    });

    return NextResponse.json({ runs, missions: missionsMap });
  } catch (error) {
    console.error("Failed to fetch agent runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent runs", detail: String(error) },
      { status: 500 }
    );
  }
}
