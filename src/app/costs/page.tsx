"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFetch } from "@/hooks/use-fetch";
import { DollarSign, TrendingUp, BarChart3, PieChart as PieIcon, X } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CostsData {
  costs: Array<{
    date: string;
    total: number;
    byModel: Record<string, number>;
    byProject: Record<string, number>;
    sessions: number;
    detailByModel?: Record<string, number>;
    detailByProject?: Record<string, number>;
  }>;
  range: string;
}

type DateRange = "last7" | "all" | "day";

const MODEL_COLORS: Record<string, string> = {
  "claude-opus": "#f59e0b",
  "claude-sonnet": "#3b82f6",
  "claude-haiku": "#10b981",
  "minimax": "#ec4899",
  "kimi": "#8b5cf6",
  "gpt": "#06b6d4",
  "other": "#71717a",
};

const PROJECT_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

// Custom tooltip showing model and project breakdown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  
  // Get the full cost data from the payload
  const chartData = payload[0]?.payload;
  const byModel = chartData?.detailByModel || chartData?.byModel || {};
  const byProject = chartData?.detailByProject || chartData?.byProject || {};
  
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-lg min-w-[200px]">
      <p className="text-sm font-medium text-zinc-100 mb-1">{label}</p>
      <p className="text-lg font-bold text-amber-400 mb-2">
        Total: ${(chartData?.total || 0).toFixed(2)}
      </p>
      
      {/* By Model */}
      {Object.keys(byModel).length > 0 && (
        <>
          <div className="border-t border-zinc-700 my-2" />
          <p className="text-xs text-zinc-500 mb-1">By Model:</p>
          {(Object.entries(byModel) as [string, number][])
            .sort(([, a], [, b]) => b - a)
            .map(([model, value]) => (
              <div key={model} className="flex justify-between text-sm">
                <span className="text-zinc-300">• {model}:</span>
                <span className="font-mono text-zinc-100">${value.toFixed(2)}</span>
              </div>
            ))}
        </>
      )}
      
      {/* By Project */}
      {Object.keys(byProject).length > 0 && (
        <>
          <div className="border-t border-zinc-700 my-2" />
          <p className="text-xs text-zinc-500 mb-1">By Project:</p>
          {(Object.entries(byProject) as [string, number][])
            .sort(([, a], [, b]) => b - a)
            .map(([project, value]) => (
              <div key={project} className="flex justify-between text-sm">
                <span className="text-zinc-300">• {project}:</span>
                <span className="font-mono text-zinc-100">${value.toFixed(2)}</span>
              </div>
            ))}
        </>
      )}
    </div>
  );
}


export default function CostsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("last7");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  // Build URL with range query param (API filters server-side)
  const apiUrl = useMemo(() => {
    return `/api/costs?range=${dateRange === "day" ? "all" : dateRange}`;
  }, [dateRange]);
  
  const { data, loading } = useFetch<CostsData>(apiUrl, 60000);

  const costs = useMemo(() => data?.costs || [], [data?.costs]);
  const today = useMemo(() => {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  }, []);

  // Filter costs based on selection (API returns all, client filters for "day" view)
  const filteredCosts = useMemo(() => {
    if (dateRange === "day" && selectedDay) {
      return costs.filter((c) => c.date === selectedDay);
    }
    // For "last7" and "all", API already filtered - just use costs
    return costs;
  }, [costs, dateRange, selectedDay]);


  // Get selected day's data

  // Prepare daily line chart data (already sorted ascending by API)
  const dailyData = filteredCosts.map((c) => ({
    date: c.date.slice(5), // MM-DD
    fullDate: c.date,
    total: c.total,
    sessions: c.sessions,
    isSelected: c.date === selectedDay,
    // Include detailed breakdown for custom tooltip
    detailByModel: c.detailByModel || c.byModel,
    detailByProject: c.detailByProject || c.byProject,
  }));

  // Prepare model breakdown data (from filtered costs)
  const modelData = useMemo(() => {
    const modelTotals: Record<string, number> = {};
    for (const c of filteredCosts) {
      const byModel = c.detailByModel || c.byModel;
      for (const [model, amount] of Object.entries(byModel)) {
        modelTotals[model] = (modelTotals[model] || 0) + amount;
      }
    }
    return Object.entries(modelTotals).map(([model, total]) => ({
      model,
      total,
      fill: MODEL_COLORS[model] || "#71717a",
    }));
  }, [filteredCosts]);

  // Prepare project breakdown data (from filtered costs)
  const projectData = useMemo(() => {
    const projectTotals: Record<string, number> = {};
    for (const c of filteredCosts) {
      const byProject = c.detailByProject || c.byProject;
      for (const [project, amount] of Object.entries(byProject)) {
        projectTotals[project] = (projectTotals[project] || 0) + amount;
      }
    }
    return Object.entries(projectTotals).map(([name, value], i) => ({
      name,
      value,
      fill: PROJECT_COLORS[i % PROJECT_COLORS.length],
    }));
  }, [filteredCosts]);

  // Summary stats
  const totalSpend = filteredCosts.reduce((sum, c) => sum + c.total, 0);
  const totalSessions = filteredCosts.reduce((sum, c) => sum + c.sessions, 0);
  const avgDaily = filteredCosts.length > 0 ? filteredCosts.reduce((sum, c) => sum + c.total, 0) / filteredCosts.length : 0;

  // Handle click on chart point - switches to single day view

  const formatSelectedDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Cost Analytics</h1>
          <p className="text-sm text-zinc-500">Token usage and spending breakdown</p>
        </div>
        {selectedDay ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Showing:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-400">
              {formatSelectedDate(selectedDay)}
              <button
                onClick={() => {
                  setSelectedDay(null);
                  setDateRange("last7");
                }}
                className="ml-1 hover:text-amber-200"
                title="Clear filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 rounded-lg bg-zinc-800 p-1">
            <button
              onClick={() => setDateRange("last7")}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                dateRange === "last7"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange("all")}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                dateRange === "all"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All Time
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-400" />
              {dateRange === "day" && selectedDay 
                ? formatSelectedDate(selectedDay) 
                : dateRange === "all" 
                  ? "All Time" 
                  : `Last 7 Days`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">
              ${totalSpend.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              {dateRange === "day" && selectedDay ? "Sessions" : "Avg Daily"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dateRange === "day" && selectedDay ? totalSessions : `$${avgDaily.toFixed(2)}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dateRange === "day" && selectedDay ? "" : "Total Sessions"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dateRange === "day" && selectedDay ? "—" : totalSessions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Spend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Daily Spend
            <span className="text-xs text-zinc-500">
              {dateRange === "all" ? "(All Time)" : dateRange === "last7" ? "(Last 7 Days)" : `(Selected: ${formatSelectedDate(selectedDay!)})`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                <YAxis
                  stroke="#71717a"
                  fontSize={12}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Spend"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: "#f59e0b", r: 4 }}
                  activeDot={{ r: 6 }}
                  onClick={() => {}}
                  style={{ cursor: "pointer" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Model Breakdown + Project Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {selectedDay ? `By Model (${formatSelectedDate(selectedDay)})` : "By Model (All Time)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="model" stroke="#71717a" fontSize={11} />
                  <YAxis
                    stroke="#71717a"
                    fontSize={12}
                    tickFormatter={(v) => `$${v.toFixed(0)}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Cost" radius={[4, 4, 0, 0]}>
                    {modelData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="h-4 w-4" />
              {selectedDay ? `By Project (${formatSelectedDate(selectedDay)})` : "By Project (All Time)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                  >
                    {projectData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
