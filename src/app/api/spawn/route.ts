import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, model, thinking, missionId, label: customLabel } = body;

    if (!task) {
      return NextResponse.json(
        { error: "Task is required" },
        { status: 400 }
      );
    }

    // Get mission details if missionId provided
    let missionContext = "";
    if (missionId) {
      try {
        const opsDbPath = process.env.OPS_DB_PATH || '/Users/lbelyaev/.openclaw/workspace/ops.db';
        const { stdout } = await execFileAsync('sqlite3', [
          opsDbPath,
          "-cmd",
          ".mode json",
          `SELECT title, description, expected_outcome FROM missions WHERE id = ${missionId};`
        ], { timeout: 5000 });
        
        if (stdout) {
          const missionData = JSON.parse(stdout.trim());
          missionContext = `\n\nMISSION CONTEXT (#${missionId}: ${missionData.title}):\n${missionData.description || ''}\nExpected Outcome: ${missionData.expected_outcome || ''}`;
        }
      } catch (e) {
        console.error('Failed to fetch mission context:', e);
      }
    }

    // Generate label
    const label = customLabel || `spawn-${Date.now()}`;
    
    // Build the task with mission context
    const fullTask = `${task}${missionContext}`;
    
    // Write task to a temp file for the agent to read
    const tempDir = os.tmpdir();
    const taskFile = path.join(tempDir, `agent-task-${label}.md`);
    await fs.promises.writeFile(taskFile, fullTask, 'utf-8');
    
    // Log the spawn attempt
    console.log('Spawning agent:', { label, task: fullTask.substring(0, 200), missionId });
    
    // Insert agent run record into database with mission_id
    const opsDbPath = process.env.OPS_DB_PATH || '/Users/lbelyaev/.openclaw/workspace/ops.db';
    const insertSql = `
      INSERT INTO agent_runs (label, mission_id, model, thinking_level, status, started_at)
      VALUES ('${label}', ${missionId || 'NULL'}, '${model || 'unknown'}', '${thinking || 'medium'}', 'pending', datetime('now'));
    `;
    
    await execFileAsync('sqlite3', [opsDbPath, insertSql], { timeout: 3000 });
    
    // Return success - actual agent spawning requires OpenClaw integration
    return NextResponse.json({ 
      success: true, 
      message: "Agent spawn record created. Use 'openclaw agent spawn' or dashboard to complete.",
      run: {
        label,
        task: fullTask.substring(0, 500),
        model: model || 'default',
        thinking_level: thinking || 'medium',
        mission_id: missionId || null,
        status: 'pending',
        task_file: taskFile,
      }
    });

  } catch (error) {
    console.error("Failed to spawn agent:", error);
    return NextResponse.json(
      { error: "Failed to spawn agent", detail: String(error) },
      { status: 500 }
    );
  }
}
