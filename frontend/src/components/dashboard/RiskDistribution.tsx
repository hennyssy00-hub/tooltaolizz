'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { usePlatform } from '@/context/PlatformContext';

const COLORS = {
  safe: '#10b981',      // Emerald
  watch: '#f59e0b',     // Amber
  suspicious: '#f97316',// Orange
  critical: '#ef4444',  // Red
};

const LABELS = {
  safe: 'An toàn',
  watch: 'Theo dõi',
  suspicious: 'Nghi vấn',
  critical: 'Nguy hiểm',
};

export function RiskDistribution() {
  const { category } = usePlatform();

  const { data, isLoading } = useQuery({
    queryKey: ['risk-distribution', category],
    queryFn: () => api.getRiskDistribution(category),
  });

  if (isLoading || !data) return <div className="h-80 flex items-center justify-center"><LoadingSpinner /></div>;

  const chartData = data.map(d => ({
    name: LABELS[d.level],
    value: d.count,
    color: COLORS[d.level],
  }));

  return (
    <div className="card h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-slate-100">Phân bố rủi ro</h3>
        <span className="text-xs text-slate-400 capitalize">{category === 'all' ? 'Tất cả' : category}</span>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
