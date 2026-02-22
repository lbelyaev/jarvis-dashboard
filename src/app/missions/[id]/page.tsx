'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AgentRun } from '@/lib/ops-db';

const ALL_STATUSES = ['planned', 'in-progress', 'done', 'failed', 'blocked', 'deferred', 'archived', 'backlog'];

const statusColors: Record<string, string> = {
  planned: 'border-gray-500 text-gray-400 bg-gray-500/10',
  'in-progress': 'border-yellow-500 text-yellow-400 bg-yellow-500/10',
  done: 'border-green-500 text-green-400 bg-green-500/10',
  failed: 'border-red-500 text-red-400 bg-red-500/10',
  blocked: 'border-red-500 text-red-400 bg-red-500/10',
  deferred: 'border-gray-500 text-gray-400 bg-gray-500/10',
  archived: 'border-zinc-600 text-zinc-500 bg-zinc-800/50',
  backlog: 'border-slate-500 text-slate-400 bg-slate-500/10',
};

const runStatusColors: Record<string, string> = {
  completed: 'border-green-500 text-green-400 bg-green-500/10',
  failed: 'border-red-500 text-red-400 bg-red-500/10',
  running: 'border-yellow-500 text-yellow-400 bg-yellow-500/10',
  pending: 'border-gray-500 text-gray-400 bg-gray-500/10',
};

const typeColors: Record<string, string> = {
  bug: 'bg-red-500/20 text-red-400',
  feature: 'bg-blue-500/20 text-blue-400',
  chore: 'bg-gray-500/20 text-gray-400',
  hotfix: 'bg-orange-500/20 text-orange-400',
};

interface Repo {
  id: number;
  name: string;
  project: string | null;
}

interface Mission {
  id: number;
  title: string;
  description: string | null;
  mission_type: string | null;
  status: string;
  priority: string | null;
  project: string | null;
  repo_id: number | null;
  expected_outcome: string | null;
  definition_of_done: string | null;
  outcome: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// Editable text field component
function EditableField({
  label,
  value,
  onSave,
  multiline = false,
}: {
  label: string;
  value: string | null;
  onSave: (value: string) => void;
  multiline?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(editValue);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="group cursor-pointer"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-zinc-400">{label}</h3>
          <span className="text-xs text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to edit
          </span>
        </div>
        <div className="text-zinc-300 whitespace-pre-wrap">
          {value || <span className="text-zinc-600 italic">No {label.toLowerCase()} set</span>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-zinc-400">{label}</h3>
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-xs text-zinc-500">Saving...</span>}
        </div>
      </div>
      
      {multiline ? (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-zinc-500 min-h-[100px] resize-y"
          autoFocus
        />
      ) : (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-zinc-500"
          autoFocus
        />
      )}
      
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded transition-colors disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="px-3 py-1 text-zinc-500 hover:text-zinc-300 text-sm transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Agent Run Card (Commit)
function AgentRunCard({ run, index }: { run: AgentRun; index: number }) {
  const formatDuration = (sec: number | null) => {
    if (!sec) return 'N/A';
    if (sec < 60) return `${sec.toFixed(1)}s`;
    return `${(sec / 60).toFixed(1)}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusColor = runStatusColors[run.status] || runStatusColors.pending;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-4">
        {/* Index */}
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-sm font-medium text-zinc-400">
          {index + 1}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-medium text-zinc-200">{run.label}</span>
            <span className={`px-2 py-0.5 text-xs rounded border ${statusColor}`}>
              {run.status}
            </span>
          </div>

          {/* Model & Thinking */}
          <div className="flex items-center gap-2 mb-2 text-sm">
            <span className="text-zinc-500">{run.model}</span>
            {run.thinking_level && (
              <span className="text-zinc-600">· {run.thinking_level}</span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-2 text-sm text-zinc-500">
            <span>⏱ {formatDuration(run.duration_sec)}</span>
            {run.cost_usd != null && <span className="text-amber-400">${run.cost_usd.toFixed(4)}</span>}
            {run.tokens_input != null && (
              <span>{run.tokens_input.toLocaleString()} → {run.tokens_output?.toLocaleString()} tokens</span>
            )}
            <span>{formatDate(run.started_at)}</span>
          </div>

          {/* Error */}
          {run.error && (
            <div className="bg-red-900/20 border border-red-800/50 rounded p-2 mt-2">
              <pre className="text-red-400 text-xs whitespace-pre-wrap">{run.error}</pre>
            </div>
          )}

          {/* Result Summary */}
          {run.result_summary && !run.error && (
            <div className="mt-2">
              <p className="text-zinc-400 text-sm line-clamp-3">{run.result_summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MissionDetailPage() {
  const params = useParams();
  const missionId = params?.id as string;
  
  const [mission, setMission] = useState<Mission | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const fetchMission = useCallback(async () => {
    if (!missionId) return;
    try {
      const res = await fetch(`/api/missions?id=${missionId}`);
      if (!res.ok) throw new Error('Failed to fetch mission');
      const data = await res.json();
      setMission(data.mission);
      setRuns(data.runs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  const fetchRepos = useCallback(async () => {
    try {
      const res = await fetch('/api/repos');
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos || []);
      }
    } catch (err) {
      console.error('Failed to fetch repos:', err);
    }
  }, []);
    
  useEffect(() => {
    fetchMission();
    fetchRepos();
  }, [fetchMission, fetchRepos]);

  const updateMission = async (updates: Partial<Mission>) => {
    if (!mission || saving) return;
    setSaving(true);
    setSaveFeedback(null);
    try {
      const res = await fetch(`/api/missions/${mission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      setMission(data.mission);
      setSaveFeedback('Saved');
      setTimeout(() => setSaveFeedback(null), 2000);
    } catch (err) {
      console.error('Update failed:', err);
      setSaveFeedback('Error');
      setTimeout(() => setSaveFeedback(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateMission({ status: e.target.value });
  };

  const handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const repoId = e.target.value ? parseInt(e.target.value) : null;
    updateMission({ repo_id: repoId });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          <span className="text-zinc-400">Loading mission...</span>
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Mission not found'}</p>
          <Link href="/missions" className="text-blue-400 hover:underline">
            ← Back to missions
          </Link>
        </div>
      </div>
    );
  }

  const projectKey = mission.project?.toLowerCase() || 'personal';
  const statusColor = statusColors[mission.status] || statusColors.planned;
  const typeColor = mission.mission_type ? typeColors[mission.mission_type.toLowerCase()] : '';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link 
          href="/missions" 
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          ← Back to missions
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="px-3 py-1 rounded-full text-sm border border-zinc-700 text-zinc-400 bg-zinc-900/50">
              {mission.project || 'personal'}
            </span>
            
            {/* Editable Status with feedback */}
            <div className="relative">
              <select
                value={mission.status}
                onChange={handleStatusChange}
                disabled={saving}
                className={`px-3 py-1 rounded-full text-sm border bg-transparent cursor-pointer hover:opacity-80 transition-all ${statusColor}`}
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace('-', ' ')}</option>
                ))}
              </select>
              {saveFeedback && (
                <span className="absolute -right-16 top-1/2 -translate-y-1/2 text-xs text-green-400">
                  {saveFeedback}
                </span>
              )}
            </div>
            
            {/* Editable Repo */}
            <select
              value={mission.repo_id || ''}
              onChange={handleRepoChange}
              disabled={saving}
              className="px-3 py-1 rounded-full text-sm border bg-zinc-800/50 border-zinc-700 text-zinc-300 cursor-pointer hover:border-zinc-600 transition-colors"
            >
              <option value="">No repo</option>
              {repos.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            
            {mission.mission_type && (
              <span className={`px-3 py-1 rounded-full text-sm ${typeColor}`}>
                {mission.mission_type}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold mb-6">{mission.title}</h1>
        </div>

        {/* Editable Fields - Full Width */}
        <div className="space-y-6 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <EditableField
              label="Description"
              value={mission.description}
              onSave={(v) => updateMission({ description: v })}
              multiline
            />
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <EditableField
              label="Expected Outcome"
              value={mission.expected_outcome}
              onSave={(v) => updateMission({ expected_outcome: v })}
              multiline
            />
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <EditableField
              label="Definition of Done"
              value={mission.definition_of_done}
              onSave={(v) => updateMission({ definition_of_done: v })}
              multiline
            />
          </div>

          {mission.outcome && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-zinc-400">Outcome</h3>
              </div>
              <p className="text-zinc-300 whitespace-pre-wrap">{mission.outcome}</p>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-8">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Dates</h3>
          <div className="flex flex-wrap gap-8 text-sm">
            <div>
              <span className="text-zinc-500">Created:</span>{' '}
              <span className="text-zinc-300">{formatDate(mission.created_at)}</span>
            </div>
            {mission.started_at && (
              <div>
                <span className="text-zinc-500">Started:</span>{' '}
                <span className="text-zinc-300">{formatDate(mission.started_at)}</span>
              </div>
            )}
            {mission.completed_at && (
              <div>
                <span className="text-zinc-500">Completed:</span>{' '}
                <span className="text-zinc-300">{formatDate(mission.completed_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Audit Trail - Agent Runs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Commits</h2>
            <span className="text-sm text-zinc-500">{runs.length} agent run{runs.length !== 1 ? 's' : ''}</span>
          </div>
          
          {runs.length === 0 ? (
            <div className="text-zinc-500 italic py-4">
              No agent runs recorded for this mission.
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run, index) => (
                <AgentRunCard key={run.id} run={run} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
