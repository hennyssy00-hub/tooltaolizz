'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { usePlatform } from '@/context/PlatformContext';

export function TrendChart() {
  const { category } = usePlatform();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-trends', category],
    queryFn: () => api.getDashboardTrends(category),
  });

  if (isLoading || !data) return <div className="h-80 flex items-center justify-center"><LoadingSpinner /></div>;

  const formattedData = data.map(d => ({
    ...d,
    dateStr: format(new Date(d.date), 'dd/MM'),
  }));

  return (
    <div className="card h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-slate-100">
          Xu hướng cảnh báo {category === 'sports' ? '(Thể Thao)' : category === 'casino' ? '(Casino)' : '(Toàn bộ)'}
        </h3>
        <span className="text-xs text-slate-400">15 ngày gần nhất</span>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Legend verticalAlign="top" height={36} />
            <Line type="monotone" dataKey="critical" name="Nguy hiểm" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="high" name="Nghi vấn" stroke="#f97316" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="medium" name="Theo dõi" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
