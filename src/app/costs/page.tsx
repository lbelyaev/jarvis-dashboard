"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFetch } from "@/hooks/use-fetch";
import { DollarSign, TrendingUp, BarChart3, PieChart as PieIcon } from "lucide-react";
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
  }>;
}

const MODEL_COLORS: Record<string, string> = {
  "claude-opus": "#f59e0b",
  "claude-sonnet": "#3b82f6",
  "claude-haiku": "#10b981",
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-lg">
      <p className="text-xs text-zinc-400 mb-2">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-300">{entry.name}:</span>
          <span className="font-mono text-zinc-100">
            ${(entry.value / 100).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CostsPage() {
  const { data, loading } = useFetch<CostsData>("/api/costs", 60000);

  const costs = data?.costs || [];

  // Prepare daily line chart data
  const dailyData = costs.map((c) => ({
    date: c.date.slice(5), // MM-DD
    total: c.total,
    sessions: c.sessions,
  }));

  // Prepare model breakdown data
  const modelTotals: Record<string, number> = {};
  for (const c of costs) {
    for (const [model, amount] of Object.entries(c.byModel)) {
      modelTotals[model] = (modelTotals[model] || 0) + amount;
    }
  }
  const modelData = Object.entries(modelTotals).map(([model, total]) => ({
    model,
    total,
    fill: MODEL_COLORS[model] || "#71717a",
  }));

  // Prepare project breakdown data
  const projectTotals: Record<string, number> = {};
  for (const c of costs) {
    for (const [project, count] of Object.entries(c.byProject)) {
      projectTotals[project] = (projectTotals[project] || 0) + count;
    }
  }
  const projectData = Object.entries(projectTotals).map(([name, value], i) => ({
    name,
    value,
    fill: PROJECT_COLORS[i % PROJECT_COLORS.length],
  }));

  // Summary stats
  const totalSpend = costs.reduce((sum, c) => sum + c.total, 0);
  const totalSessions = costs.reduce((sum, c) => sum + c.sessions, 0);
  const avgDaily = costs.length > 0 ? totalSpend / costs.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Cost Analytics</h1>
        <p className="text-sm text-zinc-500">Token usage and spending breakdown</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-400" />
              Total Spend ({costs.length}d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">
              ${(totalSpend / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Avg Daily
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${(avgDaily / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSessions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Spend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Daily Spend
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
                  tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
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
              By Model
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
                    tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
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
              By Project
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
