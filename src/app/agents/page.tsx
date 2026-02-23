'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface AgentRun {
  id: number;
  label: string;
  mission_id: number | null;
  model: string;
  thinking_level: string | null;
  status: string;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  duration_sec: number | null;
  started_at: string;
  completed_at: string | null;
  result_summary: string | null;
  error: string | null;
}

interface Mission {
  id: number;
  title: string;
  project: string | null;
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  done: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  running: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  pending: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  killed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const MODELS = [
  'anthropic/claude-sonnet-4-5-20250929',
  'anthropic/claude-sonnet-4-20250514',
  'openai/gpt-5.2-2025-12-11',
];

const THINKING_LEVELS = ['off', 'low', 'medium', 'high'];

function formatDuration(sec: number | null): string {
  if (!sec) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function formatCost(cost: number | null): string {
  if (cost == null) return '—';
  return `$${cost.toFixed(4)}`;
}

function AgentRunRow({ run, mission }: { run: AgentRun; mission?: Mission }) {
  const statusColor = statusColors[run.status] || statusColors.pending;
  const missionProject = mission?.project || 'personal';
  const projectColors: Record<string, string> = {
    boost: 'text-orange-400',
    x1: 'text-blue-400',
    ape: 'text-green-400',
    personal: 'text-purple-400',
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="font-medium text-zinc-200 truncate">{run.label}</span>
            <span className={`px-2 py-0.5 text-xs rounded border ${statusColor}`}>
              {run.status}
            </span>
            <span className="text-zinc-500 text-sm">{run.model}</span>
            {run.thinking_level && (
              <span className="text-zinc-600 text-sm">· {run.thinking_level}</span>
            )}
          </div>

          {/* Mission Link */}
          {mission && (
            <div className="mb-2">
              <Link
                href={`/missions/${mission.id}`}
                className={`text-sm hover:underline ${projectColors[missionProject] || 'text-zinc-400'}`}
              >
                Mission #{mission.id}: {mission.title}
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <span>⏱ {formatDuration(run.duration_sec)}</span>
            <span className="text-amber-400">{formatCost(run.cost_usd)}</span>
            {run.tokens_input && (
              <span>{run.tokens_input.toLocaleString()} → {run.tokens_output?.toLocaleString()} tokens</span>
            )}
            <span>
              {new Date(run.started_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* Result or Error */}
          {run.error && (
            <div className="mt-2 bg-red-900/20 border border-red-800/50 rounded p-2">
              <pre className="text-red-400 text-xs whitespace-pre-wrap">{run.error.substring(0, 200)}</pre>
            </div>
          )}
          {run.result_summary && !run.error && (
            <p className="mt-2 text-zinc-400 text-sm line-clamp-2">{run.result_summary}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Spawn Agent Modal
function SpawnAgentModal({
  isOpen,
  onClose,
  onSpawn,
  missions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSpawn: (data: { task: string; model: string; thinking: string; missionId: string }) => void;
  missions: Mission[];
}) {
  const [task, setTask] = useState('');
  const [model, setModel] = useState(MODELS[0]);
  const [thinking, setThinking] = useState('medium');
  const [missionId, setMissionId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSpawn({ task, model, thinking, missionId });
    setTask('');
    setMissionId('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Spawn Sub-Agent</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Task</label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Describe the task for the sub-agent..."
              rows={4}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-zinc-500 resize-y"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300"
              >
                {MODELS.map(m => (
                  <option key={m} value={m}>{m.split('/').pop()?.split('-')[0]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Thinking</label>
              <select
                value={thinking}
                onChange={(e) => setThinking(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300"
              >
                {THINKING_LEVELS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Mission (optional)</label>
            <select
              value={missionId}
              onChange={(e) => setMissionId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300"
            >
              <option value="">No mission</option>
              {missions.map(m => (
                <option key={m.id} value={m.id}>#{m.id}: {m.title}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
            >
              Spawn Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [missions, setMissions] = useState<Record<number, Mission>>({});
  const [missionsList, setMissionsList] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [showSpawnModal, setShowSpawnModal] = useState(false);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterModel) params.append('model', filterModel);

      const res = await fetch(`/api/agent-runs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch runs');
      const data = await res.json();
      setRuns(data.runs || []);
      setMissions(data.missions || {});
    } catch (err) {
      console.error('Error fetching runs:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterModel]);

  const fetchMissions = useCallback(async () => {
    try {
      const res = await fetch('/api/missions');
      if (!res.ok) throw new Error('Failed to fetch missions');
      const data = await res.json();
      setMissionsList(data.missions || []);
    } catch (err) {
      console.error('Error fetching missions:', err);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
    fetchMissions();
  }, [fetchRuns, fetchMissions]);

  const handleSpawn = async (data: { task: string; model: string; thinking: string; missionId: string }) => {
    try {
      const res = await fetch('/api/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to spawn agent');
      setShowSpawnModal(false);
      // Refresh runs list
      fetchRuns();
    } catch (err) {
      console.error('Error spawning agent:', err);
      alert('Failed to spawn agent: ' + String(err));
    }
  };

  // Get unique models for filter
  const models = [...new Set(runs.map(r => r.model).filter(Boolean))];
  const statuses = [...new Set(runs.map(r => r.status).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Sub-Agents</h1>
          <p className="text-zinc-500 text-sm mt-1">{runs.length} run{runs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowSpawnModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
        >
          + Spawn Agent
        </button>
      </div>

      {/* Spawn Modal */}
      <SpawnAgentModal
        isOpen={showSpawnModal}
        onClose={() => setShowSpawnModal(false)}
        onSpawn={handleSpawn}
        missions={missionsList}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300"
        >
          <option value="">All statuses</option>
          {statuses.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300"
        >
          <option value="">All models</option>
          {models.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <button
          onClick={() => { setFilterStatus(''); setFilterModel(''); }}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          Clear filters
        </button>
      </div>

      {/* Runs List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p>No agent runs found</p>
          </div>
        ) : (
          runs.map((run) => (
            <AgentRunRow
              key={run.id}
              run={run}
              mission={run.mission_id ? missions[run.mission_id] : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
