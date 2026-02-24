'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AgentRun, Mission, MissionStep, Repo } from '@/lib/ops-db';

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

export default function MissionDetailClient({ 
  initialMission, 
  initialSteps, 
  initialRuns, 
  initialRepos 
}: { 
  initialMission: Mission | null;
  initialSteps: MissionStep[];
  initialRuns: AgentRun[];
  initialRepos: Repo[];
}) {
  const [mission] = useState(initialMission);
  const [runs] = useState(initialRuns);
  const [steps] = useState(initialSteps);
  const [repos] = useState(initialRepos);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: initialMission?.description || '',
    expected_outcome: initialMission?.expected_outcome || '',
    definition_of_done: initialMission?.definition_of_done || '',
    status: initialMission?.status || 'planned',
    repo_id: String(initialMission?.repo_id || ''),
  });

  if (!mission) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Mission not found</p>
          <Link href="/missions" className="text-blue-400 hover:underline">
            ← Back to missions
          </Link>
        </div>
      </div>
    );
  }

  const isDirty = formData.description !== (mission.description || '') ||
    formData.expected_outcome !== (mission.expected_outcome || '') ||
    formData.definition_of_done !== (mission.definition_of_done || '') ||
    formData.status !== mission.status ||
    formData.repo_id !== String(mission.repo_id || '');

  const handleSave = async () => {
    if (!mission || saving || !isDirty) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/missions/${mission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          expected_outcome: formData.expected_outcome,
          definition_of_done: formData.definition_of_done,
          status: formData.status,
          repo_id: formData.repo_id ? parseInt(formData.repo_id) : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaveMessage('Saved!');
    } catch (err) {
      setSaveMessage('Error: ' + String(err));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (sec: number | null) => {
    if (!sec) return 'N/A';
    if (sec < 60) return `${sec.toFixed(1)}s`;
    return `${(sec / 60).toFixed(1)}m`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/missions" className="text-zinc-500 hover:text-zinc-300 text-sm mb-2 block">
            ← Back to missions
          </Link>
          <h1 className="text-2xl font-bold text-white">Mission #{mission.id}: {mission.title}</h1>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${statusColors[mission.status] || 'border-zinc-600 text-zinc-400'}`}>
            {mission.status}
          </span>
        </div>
        <div className="flex gap-2">
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

      {saveMessage && (
        <div className={`mb-4 p-3 rounded-lg ${saveMessage.includes('Error') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
          {saveMessage}
        </div>
      )}

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
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.name} ({repo.project})
                </option>
              ))}
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
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 resize-y"
          />
        </div>

        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-zinc-500">Created</span>
            <p className="text-zinc-300">{(mission as any).created_at ? formatDate((mission as any).created_at) : 'N/A'}</p>
          </div>
          <div>
            <span className="text-zinc-500">Started</span>
            <p className="text-zinc-300">{(mission as any).started_at ? formatDate((mission as any).started_at) : 'N/A'}</p>
          </div>
          <div>
            <span className="text-zinc-500">Updated</span>
            <p className="text-zinc-300">{(mission as any).updated_at ? formatDate((mission as any).updated_at) : 'N/A'}</p>
          </div>
          <div>
            <span className="text-zinc-500">Completed</span>
            <p className="text-zinc-300">{(mission as any).completed_at ? formatDate((mission as any).completed_at) : 'N/A'}</p>
          </div>
        </div>

        {steps.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Steps</h3>
            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.id} className="border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-400 text-sm">Step {step.step_number}</span>
                    <span className={`px-2 py-1 rounded text-xs ${stepStatusColors[step.status] || 'bg-zinc-800 text-zinc-400'}`}>
                      {step.status}
                    </span>
                  </div>
                  <h4 className="text-white font-medium">{step.title}</h4>
                  {step.description && (
                    <p className="text-zinc-400 text-sm">{step.description}</p>
                  )}
                  {step.outcome && (
                    <p className="text-zinc-500 text-sm mt-2 italic">{step.outcome}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {runs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Agent Runs</h3>
            <div className="space-y-3">
              {runs.map((run) => (
                <div key={run.id} className={`border rounded-lg p-4 ${runStatusColors[run.status] || 'border-zinc-700'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-zinc-400 text-sm">Run #{run.id}</span>
                      <p className="text-white font-medium">{run.label || 'Unnamed'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs ${runStatusColors[run.status] || 'bg-zinc-800 text-zinc-400'}`}>
                        {run.status}
                      </span>
                      <p className="text-zinc-500 text-xs mt-1">{formatDuration(run.duration_sec)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
