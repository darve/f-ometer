// ============================================
// TREEMAP COMPONENT (Share of Total)
// ============================================

import { 
  Treemap as RechartsTreemap, 
  ResponsiveContainer,
  Tooltip 
} from 'recharts';
import { useTreemap } from '@/lib/hooks';
import type { SourceFilter } from '@/lib/api';
import { PieChart } from 'lucide-react';

interface TreemapChartProps {
  source: SourceFilter;
  onTermClick?: (term: string) => void;
}

// Color scale based on count
const COLORS = [
  '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', 
  '#ef4444', '#f87171', '#fca5a5', '#fecaca'
];

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  percentage: number;
  index: number;
}

function CustomContent({ x, y, width, height, name, percentage, index }: TreemapContentProps) {
  const color = COLORS[Math.min(index, COLORS.length - 1)];
  const showLabel = width > 60 && height > 30;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="#0a0a0a"
        strokeWidth={2}
        rx={4}
        className="transition-opacity hover:opacity-80 cursor-pointer"
      />
      {showLabel && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#fff"
            stroke="none"
            fontSize={13}
            fontWeight="bold"
            dominantBaseline="middle"
            style={{ paintOrder: 'fill' }}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 12}
            textAnchor="middle"
            fill="#fff"
            stroke="none"
            fontSize={11}
            fontWeight="bold"
            dominantBaseline="middle"
            style={{ paintOrder: 'fill' }}
          >
            {percentage.toFixed(1)}%
          </text>
        </>
      )}
    </g>
  );
}

export function TreemapChart({ source, onTermClick }: TreemapChartProps) {
  const { data, isLoading, error } = useTreemap(source);
  
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
  
  const chartData = data.map((node, index) => ({
    name: node.term,
    size: node.count,
    percentage: node.percentage,
    index,
  }));
  
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-5 h-5 text-profane-400" />
        <h3 className="text-lg font-semibold">
          Share of Total Profanity
        </h3>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <RechartsTreemap
          data={chartData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#0a0a0a"
          content={<CustomContent x={0} y={0} width={0} height={0} name="" percentage={0} index={0} />}
          onClick={(node) => {
            if (onTermClick && node?.name) {
              onTermClick(node.name as string);
            }
          }}
        >
          <Tooltip
            content={({ payload }) => {
              if (!payload || !payload[0]) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-[#171717] border border-[#262626] rounded-lg p-2 text-sm">
                  <div className="font-semibold">{data.name}</div>
                  <div className="text-[var(--muted)]">
                    {data.size.toLocaleString()} occurrences ({data.percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            }}
          />
        </RechartsTreemap>
      </ResponsiveContainer>
    </div>
  );
}
