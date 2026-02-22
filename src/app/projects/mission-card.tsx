'use client';

import { Mission } from '@/lib/ops-db';

interface MissionCardProps {
  mission: Mission;
  onClick: () => void;
}

const projectColors: Record<string, string> = {
  boost: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  x1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ape: 'bg-green-500/20 text-green-400 border-green-500/30',
  personal: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const statusColors: Record<string, string> = {
  planned: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'in-progress': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  done: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
  deferred: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const typeColors: Record<string, string> = {
  bug: 'bg-red-500/20 text-red-400',
  feature: 'bg-blue-500/20 text-blue-400',
  chore: 'bg-gray-500/20 text-gray-400',
  hotfix: 'bg-orange-500/20 text-orange-400',
};

export default function MissionCard({ mission, onClick }: MissionCardProps) {
  const projectKey = mission.project?.toLowerCase() || mission.repo_project?.toLowerCase() || 'personal';
  const projectColor = projectColors[projectKey] || projectColors.personal;
  const statusColor = statusColors[mission.status] || statusColors.planned;
  const typeColor = mission.mission_type ? typeColors[mission.mission_type.toLowerCase()] : '';

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      onClick={onClick}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-800 hover:border-gray-600 transition-all"
    >
      {/* Header: Project & Status */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-2 py-0.5 rounded border ${projectColor}`}>
          {mission.project || mission.repo_project || 'personal'}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded border ${statusColor}`}>
          {mission.status}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-white mb-2 line-clamp-2">{mission.title}</h3>

      {/* Description */}
      {mission.description && (
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{mission.description}</p>
      )}

      {/* Footer: Type & Date */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          {mission.mission_type && (
            <span className={`text-xs px-2 py-0.5 rounded ${typeColor}`}>
              {mission.mission_type}
            </span>
          )}
          {mission.priority && (
            <span className="text-xs text-gray-500">{mission.priority}</span>
          )}
        </div>
        <span className="text-xs text-gray-500">{formatDate(mission.created_at)}</span>
      </div>
    </div>
  );
}
