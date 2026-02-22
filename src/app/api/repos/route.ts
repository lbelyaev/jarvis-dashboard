import { NextResponse } from "next/server";
import { getRepos } from "@/lib/ops-db";

export async function GET() {
  try {
    const repos = await getRepos();
    return NextResponse.json({ repos });
  } catch (error) {
    console.error("Failed to fetch repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch repos" },
      { status: 500 }
    );
  }
}
