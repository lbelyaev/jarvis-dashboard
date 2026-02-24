import { getMissionById, getMissionSteps, getAgentRunsForMission, getRepos } from '@/lib/ops-db';
import MissionDetailClient from './MissionDetailClient';

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const missionId = parseInt(id);
  
  const [mission, steps, runs, repos] = await Promise.all([
    getMissionById(missionId),
    getMissionSteps(missionId),
    getAgentRunsForMission(missionId),
    getRepos()
  ]);

  return <MissionDetailClient initialMission={mission} initialSteps={steps} initialRuns={runs} initialRepos={repos} />;
}
