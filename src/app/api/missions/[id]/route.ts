import { NextRequest, NextResponse } from "next/server";
import { updateMission, getMissionById } from "@/lib/ops-db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid mission ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const allowedFields = ['status', 'repo_id', 'description', 'expected_outcome', 'definition_of_done'];
    const updates: Record<string, any> = {};
    
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const mission = await updateMission(id, updates);
    if (!mission) {
      return NextResponse.json(
        { error: "Mission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ mission });
  } catch (error) {
    console.error("Failed to update mission:", error);
    return NextResponse.json(
      { error: "Failed to update mission", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid mission ID" },
        { status: 400 }
      );
    }

    const mission = await getMissionById(id);
    if (!mission) {
      return NextResponse.json(
        { error: "Mission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ mission });
  } catch (error) {
    console.error("Failed to fetch mission:", error);
    return NextResponse.json(
      { error: "Failed to fetch mission" },
      { status: 500 }
    );
  }
}