'use client';

import { Mission, MissionStep } from '@/lib/ops-db';

interface MissionDetailProps {
  mission: Mission;
  steps: MissionStep[];
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  planned: 'bg-gray-500/20 text-gray-400',
  'in-progress': 'bg-yellow-500/20 text-yellow-400',
  done: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  blocked: 'bg-red-500/20 text-red-400',
  deferred: 'bg-gray-500/20 text-gray-400',
};

const projectColors: Record<string, string> = {
  boost: 'bg-orange-500/20 text-orange-400',
  x1: 'bg-blue-500/20 text-blue-400',
  ape: 'bg-green-500/20 text-green-400',
  personal: 'bg-purple-500/20 text-purple-400',
};

export default function MissionDetail({ mission, steps, onClose }: MissionDetailProps) {
  const projectKey = mission.project?.toLowerCase() || mission.repo_project?.toLowerCase() || 'personal';

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalCost = steps.reduce((sum, step) => sum + (step.cost || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${projectColors[projectKey] || projectColors.personal}`}>
              {mission.project || mission.repo_project || 'personal'}
            </span>
            <span className={`text-xs px-2 py-1 rounded ${statusColors[mission.status] || statusColors.planned}`}>
              {mission.status}
            </span>
            {mission.mission_type && (
              <span className="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-400">
                {mission.mission_type}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Title */}
          <h2 className="text-xl font-bold text-white">{mission.title}</h2>

          {/* Description */}
          {mission.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Description</h3>
              <p className="text-gray-300">{mission.description}</p>
            </div>
          )}

          {/* Expected Outcome */}
          {mission.expected_outcome && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Expected Outcome</h3>
              <p className="text-gray-300">{mission.expected_outcome}</p>
            </div>
          )}

          {/* Definition of Done */}
          {mission.definition_of_done && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Definition of Done</h3>
              <p className="text-gray-300">{mission.definition_of_done}</p>
            </div>
          )}

          {/* Dependencies */}
          {mission.dependencies && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Dependencies</h3>
              <p className="text-gray-300">{mission.dependencies}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Priority:</span>{' '}
              <span className="text-white">{mission.priority || 'normal'}</span>
            </div>
            <div>
              <span className="text-gray-400">Created:</span>{' '}
              <span className="text-white">{formatDate(mission.created_at)}</span>
            </div>
            {mission.started_at && (
              <div>
                <span className="text-gray-400">Started:</span>{' '}
                <span className="text-white">{formatDate(mission.started_at)}</span>
              </div>
            )}
            {mission.completed_at && (
              <div>
                <span className="text-gray-400">Completed:</span>{' '}
                <span className="text-white">{formatDate(mission.completed_at)}</span>
              </div>
            )}
          </div>

          {/* Audit Trail */}
          {steps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Audit Trail</h3>
              <div className="space-y-2">
                {steps.map((step) => (
                  <div key={step.id} className="bg-gray-800 rounded p-3 flex justify-between items-center">
                    <div>
                      <span className="text-white font-medium">{step.agent_name}</span>
                      <span className="text-gray-400 text-sm ml-2">{step.action}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-green-400">${step.cost?.toFixed(4)}</span>
                      <div className="text-xs text-gray-500">{formatDate(step.started_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-right">
                <span className="text-gray-400">Total Cost: </span>
                <span className="text-green-400 font-medium">${totalCost.toFixed(4)}</span>
              </div>
            </div>
          )}

          {steps.length === 0 && (
            <div className="text-gray-500 text-sm italic">
              No agent runs recorded for this mission yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
