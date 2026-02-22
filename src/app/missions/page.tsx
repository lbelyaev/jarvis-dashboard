'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Mission } from '@/lib/ops-db';

const PROJECTS = ['boost', 'x1', 'ape', 'personal'];
const STATUSES = ['planned', 'in-progress', 'done', 'failed', 'blocked', 'deferred'];
const TYPES = ['bug', 'feature', 'chore', 'hotfix'];

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

// Dropdown component with multi-select
function MultiSelectDropdown({
  label,
  items,
  selected,
  onChange,
  getItemColor,
}: {
  label: string;
  items: string[];
  selected: string[];
  onChange: (items: string[]) => void;
  getItemColor?: (item: string) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleItem = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  const clearSelection = () => {
    onChange([]);
  };

  const displayLabel = selected.length > 0 ? `${label}: ${selected.length} selected` : label;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-3 py-2 text-sm transition-colors"
      >
        <span className="text-zinc-400">{displayLabel}</span>
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50">
          <div className="p-2">
            {items.map((item) => (
              <label
                key={item}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(item)}
                  onChange={() => toggleItem(item)}
                  className="rounded border-zinc-600"
                />
                <span className={getItemColor?.(item) || 'text-zinc-300'}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-zinc-700 p-2">
              <button
                onClick={clearSelection}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Mission list item component
function MissionListItem({ mission }: { mission: Mission }) {
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
    <Link
      href={`/missions/${mission.id}`}
      className="flex items-center gap-4 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 rounded-lg p-4 cursor-pointer transition-all group"
    >
      {/* Status indicator */}
      <div className="w-2 h-2 rounded-full flex-shrink-0 bg-current" style={{ color: statusColor.includes('yellow') ? '#eab308' : statusColor.includes('green') ? '#22c55e' : statusColor.includes('red') ? '#ef4444' : '#6b7280' }} />

      {/* Title and description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors truncate">
            {mission.title}
          </h3>
          <span className="text-zinc-500 text-sm">
            #{mission.id}
          </span>
        </div>
        {mission.description && (
          <p className="text-zinc-500 text-sm truncate">{mission.description}</p>
        )}
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`px-2 py-0.5 text-xs rounded border ${projectColor}`}>
          {mission.project || mission.repo_project || 'personal'}
        </span>
        <span className={`px-2 py-0.5 text-xs rounded border ${statusColor}`}>
          {mission.status}
        </span>
        {mission.mission_type && (
          <span className={`px-2 py-0.5 text-xs rounded ${typeColor}`}>
            {mission.mission_type}
          </span>
        )}
      </div>

      {/* Date and link */}
      <div className="flex items-center gap-3 flex-shrink-0 text-sm text-zinc-500">
        <span>{formatDate(mission.created_at)}</span>
        <svg
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();

    selectedProjects.forEach((p) => params.append('project', p));
    selectedStatuses.forEach((s) => params.append('status', s));
    selectedTypes.forEach((t) => params.append('type', t));
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

  const clearFilters = () => {
    setSelectedProjects([]);
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setSearchQuery('');
  };

  const hasFilters =
    selectedProjects.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedTypes.length > 0 ||
    searchQuery;

  // Filter missions that have a real project tag
  const filteredMissions = missions.filter((m) => {
    const project = m.project || m.repo_project || 'personal';
    if (selectedProjects.length > 0 && !selectedProjects.includes(project)) return false;
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(m.status)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(m.mission_type || '')) return false;
    if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase()) && !m.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {
        /* Header */
      }
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Missions</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {filteredMissions.length} mission{filteredMissions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {
        /* Filters */
      }
      <div className="flex flex-wrap items-center gap-3">
        {
          /* Search */
        }
        <div className="flex-1 min-w-[240px] max-w-md">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search missions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
        </div>

        {
          /* Multi-select Dropdown Filters */
        }
        <MultiSelectDropdown
          label="Project"
          items={PROJECTS}
          selected={selectedProjects}
          onChange={setSelectedProjects}
        />

        <MultiSelectDropdown
          label="Status"
          items={STATUSES}
          selected={selectedStatuses}
          onChange={setSelectedStatuses}
        />

        <MultiSelectDropdown
          label="Type"
          items={TYPES}
          selected={selectedTypes}
          onChange={setSelectedTypes}
        />
      </div>

      {
        /* Mission List */
      }
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : filteredMissions.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p>No missions found</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredMissions.map((mission) => <MissionListItem key={mission.id} mission={mission} />)
        )}
      </div>
    </div>
  );
}
