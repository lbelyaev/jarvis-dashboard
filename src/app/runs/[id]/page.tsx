import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAgentRunById, getMissionById } from '@/lib/ops-db';

function formatDuration(sec: number | null) {
  if (sec == null) return 'N/A';
  if (sec < 60) return `${sec.toFixed(1)}s`;
  return `${(sec / 60).toFixed(1)}m`;
}

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const runId = Number.parseInt(id, 10);
  if (!Number.isFinite(runId)) {
    notFound();
  }

  const run = await getAgentRunById(runId);
  if (!run) {
    notFound();
  }

  const mission = run.mission_id ? await getMissionById(run.mission_id) : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href={mission ? `/missions/${mission.id}` : '/missions'} className="text-zinc-400 hover:text-white">
            ← {mission ? 'Back to mission' : 'Back to missions'}
          </Link>
          <Link href="/missions" className="text-zinc-400 hover:text-white">
            Missions
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-6">Run #{run.id}</h1>

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <div className="text-sm text-zinc-500">Label</div>
            <div className="text-zinc-200">{run.label || 'Untitled run'}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-zinc-500">Status</div>
              <div className="text-zinc-200">{run.status}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-500">Duration</div>
              <div className="text-zinc-200">{formatDuration(run.duration_sec)}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-500">Model</div>
              <div className="text-zinc-200">{run.model}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-500">Started</div>
              <div className="text-zinc-200">{new Date(run.started_at).toLocaleString()}</div>
            </div>
          </div>

          {mission && (
            <div>
              <div className="text-sm text-zinc-500">Mission</div>
              <Link href={`/missions/${mission.id}`} className="text-blue-400 hover:underline">
                {mission.title}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
