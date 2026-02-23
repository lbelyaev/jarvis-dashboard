import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, model, thinking, missionId } = body;

    if (!task) {
      return NextResponse.json(
        { error: "Task is required" },
        { status: 400 }
      );
    }

    // Generate a unique label for the agent run
    const label = `spawn-${Date.now()}`;
    
    // Build the spawn command - this will vary based on how OpenClaw is configured
    // For now, we create a placeholder that logs the request
    // In production, this should call OpenClaw's sessions_spawn
    const spawnData = {
      id: Date.now(),
      label,
      task,
      model: model || 'anthropic/claude-sonnet-4',
      thinking_level: thinking || 'medium',
      mission_id: missionId || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Log the spawn attempt
    console.log('Spawning agent:', spawnData);

    // TODO: Integrate with OpenClaw's sessions_spawn
    // This would typically call something like:
    // await sessionsSpawn({
    //   task,
    //   model,
    //   thinking,
    //   missionId,
    //   label,
    // });

    // For now, return the spawn data so the UI can show it was initiated
    return NextResponse.json({ 
      success: true, 
      message: "Agent spawn initiated. Note: Full integration with OpenClaw spawning system required.",
      run: spawnData 
    });

  } catch (error) {
    console.error("Failed to spawn agent:", error);
    return NextResponse.json(
      { error: "Failed to spawn agent", detail: String(error) },
      { status: 500 }
    );
  }
}
