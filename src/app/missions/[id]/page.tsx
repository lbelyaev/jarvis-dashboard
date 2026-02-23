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
  done: 'border-green-500 text-green-400 bg-green-500/10',
};

const stepStatusColors: Record<string, string> = {
  pending: 'bg-zinc-800 text-zinc-500',
  'in-progress': 'bg-yellow-500/20 text-yellow-400',
  done: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  skipped: 'bg-zinc-700 text-zinc-400',
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

interface MissionStep {
  id: number;
  step_number: number;
  title: string;
  description: string | null;
  status: string;
  outcome: string | null;
  started_at: string | null;
  completed_at: string | null;
}

// Agent Run Card
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
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-sm font-medium text-zinc-400">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-medium text-zinc-200">{run.label || 'Untitled run'}</span>
            <span className={`px-2 py-0.5 text-xs rounded border ${statusColor}`}>
              {run.status}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2 text-sm">
            <span className="text-zinc-500">{run.model}</span>
            {run.thinking_level && (
              <span className="text-zinc-600">· {run.thinking_level}</span>
            )}
          </div>

          <div className="flex items-center gap-4 mb-2 text-sm text-zinc-500">
            <span>⏱ {formatDuration(run.duration_sec)}</span>
            {run.cost_usd != null && <span className="text-amber-400">${run.cost_usd.toFixed(4)}</span>}
            {run.tokens_input != null && (
              <span>{run.tokens_input.toLocaleString()} → {run.tokens_output?.toLocaleString()} tokens</span>
            )}
            <span>{formatDate(run.started_at)}</span>
          </div>

          {run.error && (
            <div className="mt-2 bg-red-900/20 border border-red-800/50 rounded p-2">
              <pre className="text-red-400 text-xs whitespace-pre-wrap">{run.error}</pre>
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

// Mission Step Card
function MissionStepCard({ step, isLast }: { step: MissionStep; isLast: boolean }) {
  const statusColor = stepStatusColors[step.status] || stepStatusColors.pending;

  return (
    <div className="flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${statusColor}`}>
          {step.step_number}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-zinc-800 my-2" />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 pb-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium text-zinc-200">{step.title}</span>
            <span className={`px-2 py-0.5 text-xs rounded ${statusColor}`}>
              {step.status}
            </span>
          </div>
          {step.description && (
            <p className="text-zinc-400 text-sm">{step.description}</p>
          )}
          {step.outcome && (
            <p className="text-zinc-500 text-sm mt-2 italic">{step.outcome}</p>
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
  const [steps, setSteps] = useState<MissionStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    expected_outcome: '',
    definition_of_done: '',
    status: '',
    repo_id: '',
  });

  const isDirty = mission && (
    formData.description !== (mission.description || '') ||
    formData.expected_outcome !== (mission.expected_outcome || '') ||
    formData.definition_of_done !== (mission.definition_of_done || '') ||
    formData.status !== mission.status ||
    formData.repo_id !== String(mission.repo_id || '')
  );

  const fetchMission = useCallback(async () => {
    if (!missionId) return;
    try {
      const res = await fetch(`/api/missions?id=${missionId}`);
      if (!res.ok) throw new Error('Failed to fetch mission');
      const data = await res.json();
      setMission(data.mission);
      setRuns(data.runs || []);
      setSteps(data.steps || []);
      setFormData({
        description: data.mission.description || '',
        expected_outcome: data.mission.expected_outcome || '',
        definition_of_done: data.mission.definition_of_done || '',
        status: data.mission.status,
        repo_id: String(data.mission.repo_id || ''),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    fetchMission();
  }, [fetchMission]);

  const handleSave = async () => {
    if (!mission || saving || !isDirty) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const updates = {
        description: formData.description,
        expected_outcome: formData.expected_outcome,
        definition_of_done: formData.definition_of_done,
        status: formData.status,
        repo_id: formData.repo_id ? parseInt(formData.repo_id) : null,
      };
      
      const res = await fetch(`/api/missions/${mission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      setMission(data.mission);
      setSaveMessage('Saved successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Update failed:', err);
      setSaveMessage('Save failed');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
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
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-sm border border-zinc-700 text-zinc-400 bg-zinc-900/50">
              {mission.project || 'personal'}
            </span>
            {mission.mission_type && (
              <span className="px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-400">
                {mission.mission_type}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold">{mission.title}</h1>
        </div>

        {/* Plan Section */}
        {steps.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Plan</h2>
              <span className="text-sm text-zinc-500">{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
              {steps.map((step, index) => (
                <MissionStepCard 
                  key={step.id} 
                  step={step} 
                  isLast={index === steps.length - 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Editable Fields Form */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-200">Mission Details</h2>
            <div className="flex items-center gap-3">
              {saveMessage && (
                <span className={`text-sm ${saveMessage.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>
                  {saveMessage}
                </span>
              )}
              <button
                onClick={() => setFormData({
                  description: mission.description || '',
                  expected_outcome: mission.expected_outcome || '',
                  definition_of_done: mission.definition_of_done || '',
                  status: mission.status,
                  repo_id: String(mission.repo_id || ''),
                })}
                disabled={saving || !isDirty}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  isDirty
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300"
                >
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Repository</label>
                <select
                  value={formData.repo_id}
                  onChange={(e) => setFormData({ ...formData, repo_id: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300"
                >
                  <option value="">No repository</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Expected Outcome</label>
              <textarea
                value={formData.expected_outcome}
                onChange={(e) => setFormData({ ...formData, expected_outcome: e.target.value })}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Definition of Done</label>
              <textarea
                value={formData.definition_of_done}
                onChange={(e) => setFormData({ ...formData, definition_of_done: e.target.value })}
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 resize-y"
              />
            </div>
          </div>
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

        {/* Commits */}
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
