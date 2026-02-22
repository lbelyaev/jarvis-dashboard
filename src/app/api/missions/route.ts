import { NextRequest, NextResponse } from 'next/server';
import { getMissions, getMissionById, getMissionSteps, getProjects, getAgentRunsForMission } from '@/lib/ops-db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const project = searchParams.getAll('project');
    const status = searchParams.getAll('status');
    const type = searchParams.getAll('type');
    const search = searchParams.get('search') || undefined;
    const id = searchParams.get('id');

    // If fetching single mission
    if (id) {
      const mission = await getMissionById(parseInt(id));
      if (!mission) {
        return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
      }
      const steps = await getMissionSteps(parseInt(id));
      const runs = await getAgentRunsForMission(parseInt(id));
      return NextResponse.json({ mission, steps, runs });
    }

    // If fetching project list
    if (searchParams.get('projects') === 'true') {
      const projects = await getProjects();
      return NextResponse.json({ projects });
    }

    // Fetch missions with filters
    const missions = await getMissions({
      project: project.length > 0 ? project : undefined,
      status: status.length > 0 ? status : undefined,
      type: type.length > 0 ? type : undefined,
      search,
    });

    return NextResponse.json({ missions });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
