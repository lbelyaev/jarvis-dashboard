'use client';

import { useState, useEffect, useCallback } from 'react';
import MissionCard from './mission-card';
import MissionDetail from './mission-detail';
import { Mission, MissionStep } from '@/lib/ops-db';

const PROJECTS = ['boost', 'x1', 'ape', 'personal'];
const STATUSES = ['planned', 'in-progress', 'done', 'failed', 'blocked', 'deferred'];
const TYPES = ['bug', 'feature', 'chore', 'hotfix'];

const projectColors: Record<string, string> = {
  boost: 'border-orange-500 text-orange-400',
  x1: 'border-blue-500 text-blue-400',
  ape: 'border-green-500 text-green-400',
  personal: 'border-purple-500 text-purple-400',
};

export default function ProjectsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [missionSteps, setMissionSteps] = useState<MissionStep[]>([]);
  
  // Filters
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    
    selectedProjects.forEach(p => params.append('project', p));
    selectedStatuses.forEach(s => params.append('status', s));
    selectedTypes.forEach(t => params.append('type', t));
    if (searchQuery) params.append('search', searchQuery);

    try {
      const res = await fetch(`/api/missions?${params.toString()}`);
      const data = await res.json();
      setMissions(data.missions || []);
    } catch (error) {
      console.error('Failed to fetch missions:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProjects, selectedStatuses, selectedTypes, searchQuery]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleMissionClick = async (mission: Mission) => {
    try {
      const res = await fetch(`/api/missions?id=${mission.id}`);
      const data = await res.json();
      setSelectedMission(data.mission);
      setMissionSteps(data.steps || []);
    } catch (error) {
      console.error('Failed to fetch mission details:', error);
      setSelectedMission(mission);
      setMissionSteps([]);
    }
  };

  const toggleFilter = (item: string, selected: string[], setSelected: (v: string[]) => void) => {
    if (selected.includes(item)) {
      setSelected(selected.filter(v => v !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  const clearFilters = () => {
    setSelectedProjects([]);
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setSearchQuery('');
  };

  const hasFilters = selectedProjects.length > 0 || selectedStatuses.length > 0 || selectedTypes.length > 0 || searchQuery;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold mb-4">Mission Control</h1>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search missions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600"
              />
            </div>

            {/* Project Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Project:</span>
              <div className="flex gap-1">
                {PROJECTS.map(project => (
                  <button
                    key={project}
                    onClick={() => toggleFilter(project, selectedProjects, setSelectedProjects)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedProjects.includes(project)
                        ? projectColors[project] + ' bg-gray-800'
                        : 'border-gray-700 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    {project}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Status:</span>
              <select
                multiple
                value={selectedStatuses}
                onChange={(e) => setSelectedStatuses(Array.from(e.target.selectedOptions, o => o.value))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm min-w-[140px] h-9"
              >
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Type:</span>
              <select
                multiple
                value={selectedTypes}
                onChange={(e) => setSelectedTypes(Array.from(e.target.selectedOptions, o => o.value))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm min-w-[120px] h-9"
              >
                {TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-400 hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mission Count */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <span className="text-sm text-gray-500">
          {loading ? 'Loading...' : `${missions.length} mission${missions.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Missions Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading missions...</div>
          </div>
        ) : missions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p>No missions found</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-gray-400 hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {missions.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onClick={() => handleMissionClick(mission)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mission Detail Modal */}
      {selectedMission && (
        <MissionDetail
          mission={selectedMission}
          steps={missionSteps}
          onClose={() => {
            setSelectedMission(null);
            setMissionSteps([]);
          }}
        />
      )}
    </div>
  );
}
