'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mission, MissionStep } from '@/lib/ops-db';

const projectColors: Record<string, string> = {
  boost: 'border-orange-500 text-orange-400 bg-orange-500/10',
  x1: 'border-blue-500 text-blue-400 bg-blue-500/10',
  ape: 'border-green-500 text-green-400 bg-green-500/10',
  personal: 'border-purple-500 text-purple-400 bg-purple-500/10',
};

const statusColors: Record<string, string> = {
  planned: 'border-gray-500 text-gray-400 bg-gray-500/10',
  'in-progress': 'border-yellow-500 text-yellow-400 bg-yellow-500/10',
  done: 'border-green-500 text-green-400 bg-green-500/10',
  failed: 'border-red-500 text-red-400 bg-red-500/10',
  blocked: 'border-red-500 text-red-400 bg-red-500/10',
  deferred: 'border-gray-500 text-gray-400 bg-gray-500/10',
};

const typeColors: Record<string, string> = {
  bug: 'bg-red-500/20 text-red-400',
  feature: 'bg-blue-500/20 text-blue-400',
  chore: 'bg-gray-500/20 text-gray-400',
  hotfix: 'bg-orange-500/20 text-orange-400',
};

export default function MissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const missionId = params?.id as string;
  
  const [mission, setMission] = useState<Mission | null>(null);
  const [steps, setSteps] = useState<MissionStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!missionId) return;
    
    const fetchMission = async () => {
      try {
        const res = await fetch(`/api/missions?id=${missionId}`);
        if (!res.ok) throw new Error('Failed to fetch mission');
        const data = await res.json();
        setMission(data.mission);
        setSteps(data.steps || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMission();
  }, [missionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
          <span className="text-gray-400">Loading mission...</span>
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Mission not found'}</p>
          <Link href="/missions" className="text-blue-400 hover:underline">
            ← Back to missions
          </Link>
        </div>
      </div>
    );
  }

  const projectKey = mission.project?.toLowerCase() || mission.repo_project?.toLowerCase() || 'personal';
  const projectColor = projectColors[projectKey] || projectColors.personal;
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
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link 
          href="/missions" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          ← Back to missions
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm border ${projectColor}`}>
              {mission.project || mission.repo_project || 'personal'}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm border ${statusColor}`}>
              {mission.status}
            </span>
            {mission.mission_type && (
              <span className={`px-3 py-1 rounded-full text-sm ${typeColor}`}>
                {mission.mission_type}
              </span>
            )}
            {mission.priority && (
              <span className="px-3 py-1 rounded-full text-sm text-gray-400 bg-gray-800">
                {mission.priority} priority
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold mb-4">{mission.title}</h1>
          
          {mission.description && (
            <p className="text-gray-400 text-lg leading-relaxed">{mission.description}</p>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {mission.expected_outcome && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Expected Outcome</h3>
              <p className="text-gray-300">{mission.expected_outcome}</p>
            </div>
          )}

          {mission.definition_of_done && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Definition of Done</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{mission.definition_of_done}</p>
            </div>
          )}

          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Dates</h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-300">
                <span className="text-gray-500">Created:</span> {formatDate(mission.created_at)}
              </p>
              {mission.started_at && (
                <p className="text-gray-300">
                  <span className="text-gray-500">Started:</span> {formatDate(mission.started_at)}
                </p>
              )}
              {mission.completed_at && (
                <p className="text-gray-300">
                  <span className="text-gray-500">Completed:</span> {formatDate(mission.completed_at)}
                </p>
              )}
            </div>
          </div>

          {mission.outcome && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Outcome</h3>
              <p className="text-gray-300">{mission.outcome}</p>
            </div>
          )}
        </div>

        {/* Audit Trail */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Audit Trail</h2>
          
          {steps.length === 0 ? (
            <p className="text-gray-500 italic">No audit trail available.</p>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div 
                  key={step.id} 
                  className="bg-gray-900/50 border border-gray-800 rounded-lg p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium">{step.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusColors[step.status] || statusColors.planned}`}>
                          {step.status}
                        </span>
                      </div>
                      {step.agent_name && (
                        <p className="text-sm text-gray-500 mb-2">Agent: {step.agent_name}</p>
                      )}
                      {step.outcome && (
                        <p className="text-sm text-gray-400">{step.outcome}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{formatDate(step.started_at)}</span>
                        {step.cost > 0 && (
                          <span className="text-amber-400">${step.cost.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
