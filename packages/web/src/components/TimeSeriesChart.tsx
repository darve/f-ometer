// ============================================
// TIME SERIES CHART COMPONENT
// ============================================

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceDot
} from 'recharts';
import { useTimeSeries } from '@/lib/hooks';
import type { SourceFilter } from '@/lib/api';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface TimeSeriesChartProps {
  term: string;
  source: SourceFilter;
}

export function TimeSeriesChart({ term, source }: TimeSeriesChartProps) {
  const { data, isLoading, error } = useTimeSeries(term, source);
  
  if (isLoading) {
    return (
      <div className="card h-80 flex items-center justify-center">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="card h-80 flex items-center justify-center">
        <div className="text-red-400">Failed to load data</div>
      </div>
    );
  }
  
  const chartData = data.points.map(p => ({
    ...p,
    time: new Date(p.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    }),
  }));
  
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-profane-400" />
          <h3 className="text-lg font-semibold">
            "{term}" over time
          </h3>
        </div>
        {data.spikes.length > 0 && (
          <div className="spike-indicator">
            <AlertTriangle className="w-4 h-4" />
            {data.spikes.length} spike{data.spikes.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis 
            dataKey="time" 
            stroke="#737373" 
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#737373" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#171717',
              border: '1px solid #262626',
              borderRadius: '8px',
              fontSize: '14px',
            }}
            labelStyle={{ color: '#fafafa' }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#ef4444' }}
          />
          {/* Mark spikes */}
          {data.spikes.map((spike, i) => {
            const pointIndex = chartData.findIndex(
              p => p.timestamp === spike.timestamp
            );
            if (pointIndex >= 0) {
              return (
                <ReferenceDot
                  key={i}
                  x={chartData[pointIndex].time}
                  y={chartData[pointIndex].value}
                  r={6}
                  fill="#f59e0b"
                  stroke="#fafafa"
                />
              );
            }
            return null;
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
